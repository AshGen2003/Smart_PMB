# Small constants shared across the accounts app. Kept separate from
# models.py so migrations never need to import live model code (Django
# migration convention) — migrations that need this list hardcode their own
# frozen copy instead of importing from here.

# The fixed set of widgets my-app's OfficerDashboardPanel.tsx can render,
# toggleable per Role via Role.dashboard_widgets (see migration
# 0025_role_dashboard_widgets.py). New roles default to all of them enabled
# so behavior is unchanged until an admin deliberately edits a role.
OFFICER_DASHBOARD_WIDGETS = [
    "kpi_total_warehouses",
    "kpi_total_stock",
    "kpi_pending_approvals",
    "kpi_active_paddy_types",
    "chart_harvest_trend",
    "chart_status_breakdown",
    "chart_stock_by_warehouse",
    "table_recent_harvests",
    "table_warehouse_stock",
]


def default_officer_dashboard_widgets():
    """Role.dashboard_widgets' default — a plain module-level function (not OFFICER_DASHBOARD_WIDGETS.copy) since Django's migration writer can't serialize a bound method."""
    return list(OFFICER_DASHBOARD_WIDGETS)
