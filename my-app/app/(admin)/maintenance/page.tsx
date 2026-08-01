/**
 * `/maintenance` — system maintenance console: audit trail, login activity,
 * alerts, backups, and global system settings. Requires `view_audit_logs`
 * to view; the settings/backup/alert-resolution controls are additionally
 * gated behind `manage_system` (read-only for users without it).
 */
import { requirePermission } from "@/app/lib/dal";
import { apiFetch } from "@/app/lib/api";
import MaintenanceManager, {
  type AlertRow,
  type AuditLogRow,
  type AuthLogRow,
  type BackupRow,
  type ErrorLogRow,
  type SystemConfigData,
} from "./MaintenanceManager";

/**
 * Server Component: gates access, fetches all maintenance data (audit
 * logs, auth logs, alerts, backups, system config) in parallel, and falls
 * back to sane config defaults if that endpoint fails.
 */
export default async function MaintenancePage() {
  const user = await requirePermission("view_audit_logs");
  const canManage = user.permissions.includes("manage_system");

  const [auditRes, authRes, errorRes, alertsRes, backupsRes, configRes] = await Promise.all([
    apiFetch("/api/admin/audit-logs/"),
    apiFetch("/api/admin/auth-logs/"),
    apiFetch("/api/admin/error-logs/"),
    apiFetch("/api/admin/alerts/"),
    apiFetch("/api/admin/backups/"),
    apiFetch("/api/admin/system-config/"),
  ]);

  const auditLogs = auditRes.ok ? ((await auditRes.json()) as AuditLogRow[]) : [];
  const authLogs = authRes.ok ? ((await authRes.json()) as AuthLogRow[]) : [];
  const errorLogs = errorRes.ok ? ((await errorRes.json()) as ErrorLogRow[]) : [];
  const alerts = alertsRes.ok ? ((await alertsRes.json()) as AlertRow[]) : [];
  const backups = backupsRes.ok ? ((await backupsRes.json()) as BackupRow[]) : [];
  // If the system-config endpoint fails, fall back to reasonable defaults
  // rather than leaving the settings form empty/broken.
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
      errorLogs={errorLogs}
      alerts={alerts}
      backups={backups}
      config={config}
      canManage={canManage}
    />
  );
}
