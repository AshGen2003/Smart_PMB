import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import MaintenanceManager, {
  type AlertRow,
  type AuditLogRow,
  type AuthLogRow,
  type BackupRow,
  type SystemConfigData,
} from "./MaintenanceManager";

export default async function MaintenancePage() {
  const user = await requirePermission("view_audit_logs");
  const canManage = user.permissions.includes("manage_system");

  const [auditRes, authRes, alertsRes, backupsRes, configRes] = await Promise.all([
    apiFetch("/api/admin/audit-logs/"),
    apiFetch("/api/admin/auth-logs/"),
    apiFetch("/api/admin/alerts/"),
    apiFetch("/api/admin/backups/"),
    apiFetch("/api/admin/system-config/"),
  ]);

  const auditLogs = auditRes.ok ? ((await auditRes.json()) as AuditLogRow[]) : [];
  const authLogs = authRes.ok ? ((await authRes.json()) as AuthLogRow[]) : [];
  const alerts = alertsRes.ok ? ((await alertsRes.json()) as AlertRow[]) : [];
  const backups = backupsRes.ok ? ((await backupsRes.json()) as BackupRow[]) : [];
  const config = configRes.ok
    ? ((await configRes.json()) as SystemConfigData)
    : {
        idle_logout_minutes: 15,
        login_lockout_threshold: 5,
        login_lockout_minutes: 15,
        maintenance_mode: false,
      };

  return (
    <MaintenanceManager
      auditLogs={auditLogs}
      authLogs={authLogs}
      alerts={alerts}
      backups={backups}
      config={config}
      canManage={canManage}
    />
  );
}
