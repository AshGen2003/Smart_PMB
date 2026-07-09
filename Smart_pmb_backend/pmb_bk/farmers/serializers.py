from rest_framework import serializers

from .models import District, Harvest, Notification, PaddyType


class ProvinceNameSerializer(serializers.Serializer):
    name = serializers.CharField()


class DistrictSerializer(serializers.ModelSerializer):
    province = ProvinceNameSerializer(read_only=True)

    class Meta:
        model = District
        fields = ["id", "name", "province"]


class PaddyTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaddyType
        fields = ["id", "type_name", "variety", "guaranteed_price"]


class HarvestSerializer(serializers.ModelSerializer):
    paddy_type_name = serializers.CharField(source="paddy_type.type_name", default=None)

    class Meta:
        model = Harvest
        fields = ["id", "paddy_type_name", "quantity_kg", "harvest_date", "status"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "message", "sent_at", "is_read"]
