from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from .models import Route
from .serializers import RouteSerializer


class RouteSerializerTests(SimpleTestCase):
    def test_warehouse_name_is_display_only_when_creating_a_route(self):
        serializer = RouteSerializer(
            data={
                "origin": "Colombo",
                "destination": "Kandy",
                "distance_km": "115.50",
                "estimated_time": "3h 20m",
                "warehouse": None,
                "warehouse_name": "Injected warehouse name",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn("warehouse_name", serializer.validated_data)
        route = Route(
            origin="Colombo",
            destination="Kandy",
            distance_km=Decimal("115.50"),
            estimated_time="3h 20m",
        )
        with patch.object(Route.objects, "create", return_value=route) as create:
            serializer.save()

        create.assert_called_once_with(
            origin="Colombo",
            destination="Kandy",
            distance_km=Decimal("115.50"),
            estimated_time="3h 20m",
            warehouse=None,
        )

    def test_warehouse_name_is_returned_for_display(self):
        warehouse = SimpleNamespace(pk=23, name="Kandy Warehouse")
        route = SimpleNamespace(
            id=7,
            origin="Kandy",
            destination="Colombo",
            distance_km="115.50",
            estimated_time="3h 20m",
            warehouse_id=23,
            warehouse=warehouse,
        )

        self.assertEqual(RouteSerializer(route).data["warehouse_name"], "Kandy Warehouse")
