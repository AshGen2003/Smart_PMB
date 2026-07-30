from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Approval


class ApprovalSerializer(serializers.ModelSerializer):
    officer_name = serializers.SerializerMethodField()

    class Meta:
        model = Approval
        fields = [
            "approval_id", "officer_name", "entity_type",
            "entity_id", "action", "note", "created_at",
        ]

    def get_officer_name(self, obj):
        return obj.officer.get_full_name() or obj.officer.email


@api_view(["GET"])
def recent_approvals(request):
    qs = Approval.objects.select_related("officer").all().order_by("-created_at")[:10]
    serializer = ApprovalSerializer(qs, many=True)
    return Response({"approvals": serializer.data})
