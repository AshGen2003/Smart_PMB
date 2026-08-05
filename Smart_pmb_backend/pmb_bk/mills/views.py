# API views for the mills app: a mill owner's own dashboard/profile/
# licenses/milling reports, and the PMB officer-facing license review queue.
# Mirrors the shape of farmers/views.py (FarmerDashboardView / IsFarmer /
# OfficerHarvestViewSet.approve/reject) for the mill-owner actor.
import random

from django.db import transaction
from django.db.models import F, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasAnyPermission, HasPermission
from farmers.models import TransactionLog, Warehouse
from farmers.views import _log_transaction
from sysops.utils import log_audit

from .models import Inspection, License, Mill, MillingAllocation, MillingReport, MillingReturnRequest, MillStock
from .permissions import IsMillOwner
from .serializers import (
    InspectionSerializer,
    InspectionWriteSerializer,
    LicenseCreateSerializer,
    LicenseSerializer,
    MillingAllocationCreateSerializer,
    MillingAllocationSerializer,
    MillingReportSerializer,
    MillingReportWriteSerializer,
    MillingReturnRequestCreateSerializer,
    MillingReturnRequestSerializer,
    MillSerializer,
    MillStockSerializer,
    MillWriteSerializer,
    OfficerInspectionSerializer,
    OfficerLicenseSerializer,
    OfficerMillingAllocationSerializer,
    OfficerMillingReturnRequestSerializer,
)

LICENSE_VALIDITY_DAYS = 365


class MillOwnerDashboardView(APIView):
    """Aggregates a logged-in mill owner's own profile, license status, and recent milling reports."""

    permission_classes = [IsMillOwner]

    def get(self, request):
        mill = get_object_or_404(
            Mill.objects.select_related("district", "province"), user=request.user
        )

        licenses = mill.licenses.all()[:6]
        milling_reports = mill.milling_reports.all()[:6]
        inspections = mill.inspections.select_related("officer").all()[:6]
        active_license = mill.licenses.filter(status=License.Status.APPROVED).order_by("-expiry_date").first()
        mill_stock = mill.stock_entries.select_related("paddy_type")

        total_paddy_processed = mill.milling_reports.aggregate(
            total=Sum("paddy_processed_kg")
        )["total"] or 0

        return Response(
            {
                "mill": MillSerializer(mill).data,
                "kpis": {
                    "total_licenses": mill.licenses.count(),
                    "active_license_status": active_license.status if active_license else None,
                    "active_license_expiry": active_license.expiry_date if active_license else None,
                    "total_milling_reports": mill.milling_reports.count(),
                    "total_paddy_processed_kg": total_paddy_processed,
                },
                "licenses": LicenseSerializer(licenses, many=True, context={"request": request}).data,
                "milling_reports": MillingReportSerializer(milling_reports, many=True).data,
                "inspections": InspectionSerializer(inspections, many=True).data,
                "mill_stock": MillStockSerializer(mill_stock, many=True).data,
            }
        )


class MillOwnerProfileView(APIView):
    """Lets the logged-in mill owner view (GET) and edit (PATCH) their own mill's business details."""

    permission_classes = [IsMillOwner]

    def get(self, request):
        mill = get_object_or_404(Mill.objects.select_related("district", "province"), user=request.user)
        return Response(MillSerializer(mill).data)

    def patch(self, request):
        mill = get_object_or_404(Mill, user=request.user)
        serializer = MillWriteSerializer(mill, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        mill = serializer.save()
        log_audit(request.user, "update_mill_profile", "mills", mill.mill_name)
        return Response(MillSerializer(mill).data)


class MillOptionsView(generics.ListAPIView):
    """GET /api/admin/mills/ — lightweight list of all registered mills, for the officer-side inspection-logging form's mill picker."""

    permission_classes = [HasPermission("approve_licenses")]

    def get_queryset(self):
        return Mill.objects.order_by("mill_name")

    def list(self, request, *args, **kwargs):
        return Response(
            [{"id": m.id, "name": f"{m.mill_name} ({m.registration_no})"} for m in self.get_queryset()]
        )


class LicenseViewSet(viewsets.ModelViewSet):
    """
    Self-service CRUD for a mill owner's own license applications: list/
    view their history, apply for a new license with the full set of
    reviewable details (capacity, milling type, premises, justification —
    optionally as a renewal of an approved one via `renewed_from`), and
    withdraw one while it's still pending (no update — approval fields are
    officer-only, set via OfficerLicenseViewSet).
    """

    permission_classes = [IsMillOwner]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return License.objects.filter(mill__user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return LicenseCreateSerializer
        return LicenseSerializer

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}

    def perform_create(self, serializer):
        serializer.save(mill=self.request.user.mill_profile)

    def destroy(self, request, *args, **kwargs):
        license_obj = self.get_object()
        if license_obj.status != License.Status.PENDING:
            return Response(
                {"detail": "Only pending license applications can be withdrawn."}, status=400
            )
        return super().destroy(request, *args, **kwargs)


class MillingReportViewSet(viewsets.ModelViewSet):
    """Self-service create/list for a mill owner's own milling reports (no update/delete — a submitted report is final)."""

    permission_classes = [IsMillOwner]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return MillingReport.objects.filter(mill__user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return MillingReportWriteSerializer
        return MillingReportSerializer

    def perform_create(self, serializer):
        serializer.save(mill=self.request.user.mill_profile)


class OfficerLicenseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    PMB officer review queue for mill license applications: list/view all
    applications, plus the approve/reject workflow actions. Viewing
    requires either "monitor_operations" or "approve_licenses"; the
    approve/reject actions require "approve_licenses" specifically.
    Mirrors OfficerHarvestViewSet.approve/reject in farmers/views.py.
    """

    queryset = License.objects.select_related("mill", "reviewed_by").order_by("-applied_date")
    serializer_class = OfficerLicenseSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [HasAnyPermission("monitor_operations", "approve_licenses")]
        return [HasPermission("approve_licenses")]

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approves a pending license: assigns a license number and a one-year validity window."""
        license_obj = self.get_object()
        if license_obj.status != License.Status.PENDING:
            return Response(
                {"detail": "Only pending license applications can be approved."}, status=400
            )

        today = timezone.now().date()
        license_obj.status = License.Status.APPROVED
        license_obj.license_no = f"LIC-{today.year}-{random.randint(100000, 999999)}"
        license_obj.issued_date = today
        license_obj.expiry_date = today + timezone.timedelta(days=LICENSE_VALIDITY_DAYS)
        license_obj.reviewed_by = request.user
        license_obj.save(
            update_fields=["status", "license_no", "issued_date", "expiry_date", "reviewed_by"]
        )
        log_audit(request.user, "approve_license", "mills", f"License #{license_obj.id}")
        return Response(self.get_serializer(license_obj).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Rejects a pending license application, recording an optional review note."""
        license_obj = self.get_object()
        if license_obj.status != License.Status.PENDING:
            return Response(
                {"detail": "Only pending license applications can be rejected."}, status=400
            )

        license_obj.status = License.Status.REJECTED
        license_obj.review_notes = request.data.get("review_notes", "")
        license_obj.reviewed_by = request.user
        license_obj.save(update_fields=["status", "review_notes", "reviewed_by"])
        log_audit(request.user, "reject_license", "mills", f"License #{license_obj.id}")
        return Response(self.get_serializer(license_obj).data)

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        """Suspends a currently-approved license, recording a required reason."""
        license_obj = self.get_object()
        if license_obj.status != License.Status.APPROVED:
            return Response(
                {"detail": "Only an approved license can be suspended."}, status=400
            )
        reason = request.data.get("reason", "").strip()
        if not reason:
            return Response({"detail": "A reason is required."}, status=400)

        license_obj.status = License.Status.SUSPENDED
        license_obj.review_notes = reason
        license_obj.reviewed_by = request.user
        license_obj.save(update_fields=["status", "review_notes", "reviewed_by"])
        log_audit(request.user, "suspend_license", "mills", f"License #{license_obj.id}: {reason}")
        return Response(self.get_serializer(license_obj).data)

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        """Revokes a license (from approved or suspended), recording a required reason."""
        license_obj = self.get_object()
        if license_obj.status not in (License.Status.APPROVED, License.Status.SUSPENDED):
            return Response(
                {"detail": "Only an approved or suspended license can be revoked."}, status=400
            )
        reason = request.data.get("reason", "").strip()
        if not reason:
            return Response({"detail": "A reason is required."}, status=400)

        license_obj.status = License.Status.REVOKED
        license_obj.review_notes = reason
        license_obj.reviewed_by = request.user
        license_obj.save(update_fields=["status", "review_notes", "reviewed_by"])
        log_audit(request.user, "revoke_license", "mills", f"License #{license_obj.id}: {reason}")
        return Response(self.get_serializer(license_obj).data)


class OfficerInspectionViewSet(viewsets.ModelViewSet):
    """
    PMB officer view/log of mill inspections: list/view all inspection
    records, plus logging a new one for a given mill. No update/delete —
    an inspection is a point-in-time record, final once submitted (same
    as MillingReport). Viewing requires either "monitor_operations" or
    "approve_licenses"; logging a new inspection requires "approve_licenses"
    specifically — the same split as OfficerLicenseViewSet above.
    """

    queryset = Inspection.objects.select_related("mill", "officer").all()
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return InspectionWriteSerializer
        return OfficerInspectionSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [HasAnyPermission("monitor_operations", "approve_licenses")]
        return [HasPermission("approve_licenses")]

    def perform_create(self, serializer):
        inspection = serializer.save(officer=self.request.user)
        log_audit(self.request.user, "log_inspection", "mills", f"Inspection #{inspection.id} ({inspection.mill.mill_name})")


class MillingAllocationViewSet(viewsets.ModelViewSet):
    """Self-service CRUD for a mill owner's own milling-allocation requests. Mirrors LicenseViewSet's shape exactly."""

    permission_classes = [IsMillOwner]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return MillingAllocation.objects.filter(mill__user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return MillingAllocationCreateSerializer
        return MillingAllocationSerializer

    def perform_create(self, serializer):
        serializer.save(mill=self.request.user.mill_profile)

    def destroy(self, request, *args, **kwargs):
        allocation = self.get_object()
        if allocation.status != MillingAllocation.Status.PENDING:
            return Response(
                {"detail": "Only a pending allocation request can be withdrawn."}, status=400
            )
        return super().destroy(request, *args, **kwargs)


class OfficerMillingAllocationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    PMB officer review queue for mill owners' milling-allocation requests:
    list/view all requests, plus the approve/reject/fulfill workflow
    actions. Mirrors purchases.OfficerRiceRequestViewSet exactly, reusing
    the same "record_purchases" codename (the purchasing/milling-request
    review permission already gating RiceRequest).
    """

    queryset = MillingAllocation.objects.select_related(
        "mill", "paddy_type", "reviewed_by", "fulfilled_from_warehouse"
    ).order_by("-requested_date")
    serializer_class = OfficerMillingAllocationSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [HasAnyPermission("monitor_operations", "record_purchases")]
        return [HasPermission("record_purchases")]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Moves a pending allocation request to "approved", ready to be fulfilled from a warehouse."""
        allocation = self.get_object()
        if allocation.status != MillingAllocation.Status.PENDING:
            return Response({"detail": "Only pending requests can be approved."}, status=400)
        allocation.status = MillingAllocation.Status.APPROVED
        allocation.reviewed_by = request.user
        allocation.save(update_fields=["status", "reviewed_by"])
        log_audit(request.user, "approve_milling_allocation", "mills", f"MillingAllocation #{allocation.id}")
        return Response(self.get_serializer(allocation).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Moves a pending allocation request straight to "rejected" (a terminal state)."""
        allocation = self.get_object()
        if allocation.status != MillingAllocation.Status.PENDING:
            return Response({"detail": "Only pending requests can be rejected."}, status=400)
        allocation.status = MillingAllocation.Status.REJECTED
        allocation.review_notes = request.data.get("review_notes", "")
        allocation.reviewed_by = request.user
        allocation.save(update_fields=["status", "review_notes", "reviewed_by"])
        log_audit(request.user, "reject_milling_allocation", "mills", f"MillingAllocation #{allocation.id}")
        return Response(self.get_serializer(allocation).data)

    @action(detail=True, methods=["post"])
    def fulfill(self, request, pk=None):
        """Confirms release of an approved allocation's quantity from a chosen warehouse into the mill's own stock ledger."""
        allocation = self.get_object()
        if allocation.status != MillingAllocation.Status.APPROVED:
            return Response({"detail": "Only approved requests can be fulfilled."}, status=400)

        warehouse_id = request.data.get("warehouse")
        warehouse = get_object_or_404(Warehouse, pk=warehouse_id)
        if warehouse.current_stock < allocation.quantity_kg:
            return Response(
                {"detail": "Selected warehouse does not have enough stock for this allocation."}, status=400
            )

        with transaction.atomic():
            Warehouse.objects.filter(pk=warehouse.pk).update(
                current_stock=F("current_stock") - allocation.quantity_kg
            )
            stock, _ = MillStock.objects.get_or_create(mill=allocation.mill, paddy_type=allocation.paddy_type)
            MillStock.objects.filter(pk=stock.pk).update(quantity_kg=F("quantity_kg") + allocation.quantity_kg)
            _log_transaction(
                warehouse,
                TransactionLog.TransactionType.MILLING_ALLOCATION_FULFILLMENT,
                -allocation.quantity_kg,
                paddy_type=allocation.paddy_type,
                updated_by=request.user,
                notes=f"MillingAllocation #{allocation.id}",
            )

            allocation.status = MillingAllocation.Status.FULFILLED
            allocation.fulfilled_from_warehouse = warehouse
            allocation.reviewed_by = request.user
            allocation.save(update_fields=["status", "fulfilled_from_warehouse", "reviewed_by"])

        log_audit(request.user, "fulfill_milling_allocation", "mills", f"MillingAllocation #{allocation.id}")
        return Response(self.get_serializer(allocation).data)


class MillingReturnRequestViewSet(viewsets.ModelViewSet):
    """Self-service create/list/withdraw for a mill owner's own milling-return transport requests."""

    permission_classes = [IsMillOwner]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return MillingReturnRequest.objects.filter(mill__user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return MillingReturnRequestCreateSerializer
        return MillingReturnRequestSerializer

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}

    def perform_create(self, serializer):
        serializer.save(mill=self.request.user.mill_profile)

    def destroy(self, request, *args, **kwargs):
        return_request = self.get_object()
        if return_request.status != MillingReturnRequest.Status.PENDING:
            return Response({"detail": "Only a pending return request can be withdrawn."}, status=400)
        return super().destroy(request, *args, **kwargs)


class OfficerMillingReturnRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """PMB officer review queue for mill owners' milling-return transport requests. Approval doesn't create the Delivery -- an officer does that separately via the Transportation page."""

    queryset = MillingReturnRequest.objects.select_related(
        "mill", "allocation", "destination_warehouse", "reviewed_by"
    ).order_by("-requested_date")
    serializer_class = OfficerMillingReturnRequestSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [HasAnyPermission("monitor_operations", "record_purchases")]
        return [HasPermission("record_purchases")]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return_request = self.get_object()
        if return_request.status != MillingReturnRequest.Status.PENDING:
            return Response({"detail": "Only pending requests can be approved."}, status=400)
        return_request.status = MillingReturnRequest.Status.APPROVED
        return_request.reviewed_by = request.user
        return_request.save(update_fields=["status", "reviewed_by"])
        log_audit(request.user, "approve_milling_return", "mills", f"MillingReturnRequest #{return_request.id}")
        return Response(self.get_serializer(return_request).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return_request = self.get_object()
        if return_request.status != MillingReturnRequest.Status.PENDING:
            return Response({"detail": "Only pending requests can be rejected."}, status=400)
        return_request.status = MillingReturnRequest.Status.REJECTED
        return_request.review_notes = request.data.get("review_notes", "")
        return_request.reviewed_by = request.user
        return_request.save(update_fields=["status", "review_notes", "reviewed_by"])
        log_audit(request.user, "reject_milling_return", "mills", f"MillingReturnRequest #{return_request.id}")
        return Response(self.get_serializer(return_request).data)
