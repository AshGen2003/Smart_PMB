from django.db import migrations, models

# Frozen copy of accounts/constants.py's OFFICER_DASHBOARD_WIDGETS at the
# time this migration was written — migrations never import live model/
# constants code (it can change independently later), so this list is
# duplicated here on purpose, same convention as every RunPython permission
# seed in this app's migration history.
DASHBOARD_WIDGETS = [
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


def default_widgets():
    return list(DASHBOARD_WIDGETS)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0024_appoint_warehouse_managers_permission"),
    ]

    operations = [
        migrations.AddField(
            model_name="role",
            # A real (non-null) default backfills every existing Role with
            # every widget enabled, so no role's dashboard changes until an
            # admin deliberately edits it via /roles.
            name="dashboard_widgets",
            field=models.JSONField(default=default_widgets, blank=True),
        ),
    ]
