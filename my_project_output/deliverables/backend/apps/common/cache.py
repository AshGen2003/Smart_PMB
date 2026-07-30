from django.core.cache import cache

CACHE_TTL = 300
DASHBOARD_KPIS_KEY = "dashboard_kpis"
WAREHOUSE_LIST_KEY = "warehouse_list"


def invalidate_warehouse_cache():
    cache.delete_pattern("warehouse_*")
    cache.delete(DASHBOARD_KPIS_KEY)
