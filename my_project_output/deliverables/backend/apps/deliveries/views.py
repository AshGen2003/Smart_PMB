from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.authentication.permissions import IsPmbOfficer
from .models import Delivery
from .serializers import DeliveryCreateSerializer, DeliveryListSerializer


@api_view(["GET"])
def delivery_list(request):
    qs = Delivery.objects.select_related("warehouse").all().order_by("-delivery_date")
    serializer = DeliveryListSerializer(qs, many=True)
    return Response({"deliveries": serializer.data})


@api_view(["POST"])
def delivery_create(request):
    permission = IsPmbOfficer()
    if not permission.has_permission(request, None):
        return Response(
            {"error": {"message": "Requires PMB_OFFICER role", "code": "FORBIDDEN"}},
            status=status.HTTP_403_FORBIDDEN,
        )
    serializer = DeliveryCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {
                "error": {
                    "message": "Invalid request body",
                    "code": "VALIDATION",
                    "details": serializer.errors,
                }
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    delivery = serializer.save(status=Delivery.Status.SCHEDULED)
    out = DeliveryListSerializer(delivery)
    return Response({"delivery": out.data}, status=status.HTTP_201_CREATED)
