"""Regression tests for farmer/transportation serializers and views."""
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from .models import Route
from .serializers import RouteSerializer


class RouteSerializerTests(SimpleTestCase):
    def test_create_does_not_treat_warehouse_name_as_nested_write(self):
        """A route POST must persist its submitted warehouse FK (or None)."""
        serializer = RouteSerializer(
            data={
                "origin": "Colombo",
                "destination": "Kandy",
                "distance_km": "115.5",
                "estimated_time": "3 hours",
                "warehouse": None,
                # A client-supplied display value must never be writable.
                "warehouse_name": "Injected warehouse name",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

        route = Route(
            origin="Colombo",
            destination="Kandy",
            distance_km=Decimal("115.50"),
            estimated_time="3 hours",
        )
        with patch.object(Route.objects, "create", return_value=route) as create:
            serializer.save()

        create.assert_called_once_with(
            origin="Colombo",
            destination="Kandy",
            distance_km=Decimal("115.50"),
            estimated_time="3 hours",
            warehouse=None,
        )

    def test_warehouse_name_is_still_returned_for_display(self):
        warehouse = SimpleNamespace(pk=23, name="Kandy Warehouse")
        route = SimpleNamespace(
            id=17,
            origin="Colombo",
            destination="Kandy",
            distance_km=Decimal("115.50"),
            estimated_time="3 hours",
            warehouse_id=23,
            warehouse=warehouse,
        )

        self.assertEqual(
            RouteSerializer(route).data,
            {
                "id": 17,
                "origin": "Colombo",
                "destination": "Kandy",
                "distance_km": "115.50",
                "estimated_time": "3 hours",
                "warehouse": 23,
                "warehouse_name": "Kandy Warehouse",
            },
        )
