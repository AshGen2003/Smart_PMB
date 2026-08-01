# API views for the mills app: a mill owner's own dashboard/profile/
# licenses/milling reports, and the PMB officer-facing license review queue.
# Mirrors the shape of farmers/views.py (FarmerDashboardView / IsFarmer /
# OfficerHarvestViewSet.approve/reject) for the mill-owner actor.
import random

from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasAnyPermission, HasPermission
from sysops.utils import log_audit

from .models import Inspection, License, Mill, MillingReport
from .permissions import IsMillOwner
from .serializers import (
    InspectionSerializer,
    InspectionWriteSerializer,
    LicenseSerializer,
    MillingReportSerializer,
    MillingReportWriteSerializer,
    MillSerializer,
    MillWriteSerializer,
    OfficerInspectionSerializer,
    OfficerLicenseSerializer,
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
                "licenses": LicenseSerializer(licenses, many=True).data,
                "milling_reports": MillingReportSerializer(milling_reports, many=True).data,
                "inspections": InspectionSerializer(inspections, many=True).data,
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
    view their history, apply for a new license, and withdraw one while
    it's still pending (no update — approval fields are officer-only, set
    via OfficerLicenseViewSet).
    """

    permission_classes = [IsMillOwner]
    http_method_names = ["get", "post", "delete", "head", "options"]
    serializer_class = LicenseSerializer

    def get_queryset(self):
        return License.objects.filter(mill__user=self.request.user)

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
        return Response(OfficerLicenseSerializer(license_obj).data)

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
        return Response(OfficerLicenseSerializer(license_obj).data)


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
