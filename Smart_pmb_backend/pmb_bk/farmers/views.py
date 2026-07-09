from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Farmer, Notification, PaddyType
from .permissions import IsFarmer
from .serializers import DistrictSerializer, HarvestSerializer, NotificationSerializer, PaddyTypeSerializer
from .models import District


class DistrictListView(generics.ListAPIView):
    queryset = District.objects.select_related("province").order_by("name")
    serializer_class = DistrictSerializer
    permission_classes = [AllowAny]


class FarmerDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsFarmer]

    def get(self, request):
        farmer = get_object_or_404(
            Farmer.objects.select_related("district", "province"), user=request.user
        )

        harvests = farmer.harvests.select_related("paddy_type")[:6]
        payments = farmer.payments.all()
        notifications = farmer.notifications.all()[:6]
        paddy_types = PaddyType.objects.filter(is_active=True)

        total_earnings = payments.filter(status="completed").aggregate(
            total=Sum("amount")
        )["total"] or 0
        pending_payments = payments.filter(status="pending").count()

        return Response(
            {
                "farmer": {
                    "registration_no": farmer.registration_no,
                    "land_size": farmer.land_size,
                    "status": farmer.status,
                    "district": farmer.district.name if farmer.district else None,
                    "province": farmer.province.name if farmer.province else None,
                },
                "kpis": {
                    "total_harvests": farmer.harvests.count(),
                    "pending_payments": pending_payments,
                    "total_earnings": total_earnings,
                },
                "paddy_types": PaddyTypeSerializer(paddy_types, many=True).data,
                "harvests": HarvestSerializer(harvests, many=True).data,
                "notifications": NotificationSerializer(notifications, many=True).data,
            }
        )


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated, IsFarmer]

    def post(self, request, pk):
        notification = get_object_or_404(
            Notification, pk=pk, farmer__user=request.user
        )
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(status=status.HTTP_204_NO_CONTENT)
