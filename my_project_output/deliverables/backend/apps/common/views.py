import os
import time

from django.core.cache import cache
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

_startup_time = time.time()


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """Production health probe: returns DB, cache, and worker status."""
    checks = {"ok": True, "service": "warehouse-api"}

    # Database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = str(e)
        checks["ok"] = False

    # Cache / Redis connectivity
    try:
        cache.set("__health__", 1, 5)
        cache.get("__health__")
        checks["cache"] = "ok"
    except Exception as e:
        checks["cache"] = str(e)
        checks["ok"] = False

    # Worker metadata
    checks["uptime_seconds"] = int(time.time() - _startup_time)
    checks["debug"] = os.environ.get("DJANGO_DEBUG", "False").lower() in ("true", "1")

    status_code = 200 if checks["ok"] else 503
    return Response(checks, status=status_code)
