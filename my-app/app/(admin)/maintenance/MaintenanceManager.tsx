"use client";

import React, { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import {
  AlertTriangle,
  Check,
  Database,
  History,
  Loader2,
  ScrollText,
  Settings2,
} from "lucide-react";
import {
  acknowledgeAlert,
  resolveAlert,
  runBackup,
  updateSystemConfig,
} from "@/app/actions/sysops";
import styles from "./Maintenance.module.css";

export type AuditLogRow = {
  id: number;
  actor: string;
  action: string;
  module: string;
  details: string;
  created_at: string;
};

export type AuthLogRow = {
  id: number;
  email: string;
  ip_address: string;
  action: "login_success" | "login_failed" | "account_locked" | "logout";
  created_at: string;
};

export type AlertRow = {
  id: number;
  alert_type: string;
  level: "info" | "warning" | "critical";
  message: string;
  status: "open" | "acknowledged" | "resolved";
  handled_by_email: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type BackupRow = {
  id: number;
  backup_type: string;
  file_path: string;
  backup_size: number;
  status: "completed" | "failed";
  notes: string;
  performed_by_email: string | null;
  created_at: string;
};

export type SystemConfigData = {
  idle_logout_minutes: number;
  login_lockout_threshold: number;
  login_lockout_minutes: number;
  maintenance_mode: boolean;
};

const AUTH_ACTION_LABEL: Record<AuthLogRow["action"], string> = {
  login_success: "Login",
  login_failed: "Failed login",
  account_locked: "Account locked",
  logout: "Logout",
};

function fmt(dateStr: string) {
  return format(new Date(dateStr), "MMM d, yyyy h:mm a");
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
}

const TABS = [
  { key: "alerts", label: "Alerts", icon: AlertTriangle },
  { key: "audit", label: "Audit Log", icon: ScrollText },
  { key: "auth", label: "Login Activity", icon: History },
  { key: "backups", label: "Backups", icon: Database },
  { key: "settings", label: "Settings", icon: Settings2 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function MaintenanceManager({
  auditLogs,
  authLogs,
  alerts,
  backups,
  config,
  canManage,
}: {
  auditLogs: AuditLogRow[];
  authLogs: AuthLogRow[];
  alerts: AlertRow[];
  backups: BackupRow[];
  config: SystemConfigData;
  canManage: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("alerts");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openAlertCount = useMemo(
    () => alerts.filter((a) => a.status === "open").length,
    [alerts]
  );

  function runAction(fn: () => Promise<{ error?: string }>, successMsg?: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
      else if (successMsg) setSuccess(successMsg);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>System Maintenance</h1>
          <div className={styles.pageSubtitle}>
            Audit trail, login activity, alerts, backups, and system settings.
          </div>
        </div>
      </div>

      <div className={styles.tabsRow}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              className={clsx(styles.tab, tab === t.key && styles.tabActive)}
              onClick={() => setTab(t.key)}
            >
              <Icon size={15} />
              {t.label}
              {t.key === "alerts" && openAlertCount > 0 && (
                <span className={styles.tabCount}>{openAlertCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {error && <div className={styles.banner}>{error}</div>}
      {success && <div className={styles.successBanner}>{success}</div>}

      {tab === "alerts" && (
        <div className={styles.container}>
          {alerts.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Level</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Raised</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr key={a.id}>
                      <td>{a.alert_type}</td>
                      <td>
                        <span className={clsx(styles.badge, styles[`badge-${a.level}`])}>
                          {a.level}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "normal" }}>{a.message}</td>
                      <td>
                        <span
                          className={clsx(
                            styles.badge,
                            a.status === "open"
                              ? styles["badge-critical"]
                              : a.status === "acknowledged"
                              ? styles["badge-warning"]
                              : styles["badge-success"]
                          )}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td>{fmt(a.created_at)}</td>
                      <td>
                        {canManage && a.status !== "resolved" && (
                          <div className={styles.rowActions}>
                            {a.status === "open" && (
                              <button
                                type="button"
                                className={styles.iconBtn}
                                aria-label="Acknowledge"
                                title="Acknowledge"
                                disabled={isPending}
                                onClick={() =>
                                  runAction(() => acknowledgeAlert(a.id), "Alert acknowledged.")
                                }
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              className={clsx(styles.iconBtn, styles.approveBtn)}
                              aria-label="Resolve"
                              title="Resolve"
                              disabled={isPending}
                              onClick={() =>
                                runAction(() => resolveAlert(a.id), "Alert resolved.")
                              }
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <AlertTriangle size={28} />
              <p>No alerts. Everything looks healthy.</p>
            </div>
          )}
        </div>
      )}

      {tab === "audit" && (
        <div className={styles.container}>
          {auditLogs.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Details</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.actor}</td>
                      <td>{log.action.replaceAll("_", " ")}</td>
                      <td>{log.module}</td>
                      <td style={{ whiteSpace: "normal" }}>{log.details || "—"}</td>
                      <td>{fmt(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <ScrollText size={28} />
              <p>No audit activity yet.</p>
            </div>
          )}
        </div>
      )}

      {tab === "auth" && (
        <div className={styles.container}>
          {authLogs.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Action</th>
                    <th>IP Address</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {authLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.email || "—"}</td>
                      <td>
                        <span
                          className={clsx(
                            styles.badge,
                            log.action === "login_success"
                              ? styles["badge-success"]
                              : log.action === "logout"
                              ? styles["badge-neutral"]
                              : styles["badge-critical"]
                          )}
                        >
                          {AUTH_ACTION_LABEL[log.action]}
                        </span>
                      </td>
                      <td>{log.ip_address || "—"}</td>
                      <td>{fmt(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <History size={28} />
              <p>No login activity recorded yet.</p>
            </div>
          )}
        </div>
      )}

      {tab === "backups" && (
        <div className={styles.container}>
          {canManage && (
            <div style={{ marginBottom: "1rem" }}>
              <button
                type="button"
                className={styles.newBtn}
                disabled={isPending}
                onClick={() => runAction(() => runBackup(), "Backup completed.")}
              >
                {isPending ? <Loader2 size={16} className={styles.spin} /> : <Database size={16} />}
                Run backup now
              </button>
            </div>
          )}
          {backups.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th>Performed by</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id}>
                      <td>{b.backup_type}</td>
                      <td>{formatBytes(b.backup_size)}</td>
                      <td>
                        <span
                          className={clsx(
                            styles.badge,
                            b.status === "completed"
                              ? styles["badge-success"]
                              : styles["badge-critical"]
                          )}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td>{b.performed_by_email ?? "—"}</td>
                      <td>{fmt(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Database size={28} />
              <p>No backups yet.</p>
            </div>
          )}
        </div>
      )}

      {tab === "settings" && (
        <div className={styles.container}>
          <SettingsForm
            config={config}
            canManage={canManage}
            isPending={isPending}
            onSave={(updates) =>
              runAction(() => updateSystemConfig(updates), "Settings saved.")
            }
          />
        </div>
      )}
    </div>
  );
}

function SettingsForm({
  config,
  canManage,
  isPending,
  onSave,
}: {
  config: SystemConfigData;
  canManage: boolean;
  isPending: boolean;
  onSave: (updates: Record<string, string>) => void;
}) {
  const [idleMinutes, setIdleMinutes] = useState(String(config.idle_logout_minutes));
  const [lockoutThreshold, setLockoutThreshold] = useState(
    String(config.login_lockout_threshold)
  );
  const [lockoutMinutes, setLockoutMinutes] = useState(String(config.login_lockout_minutes));
  const [maintenanceMode, setMaintenanceMode] = useState(config.maintenance_mode);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      idle_logout_minutes: idleMinutes,
      login_lockout_threshold: lockoutThreshold,
      login_lockout_minutes: lockoutMinutes,
      maintenance_mode: String(maintenanceMode),
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="idleMinutes">
          Idle logout (minutes)
        </label>
        <input
          id="idleMinutes"
          type="number"
          min={1}
          className={styles.input}
          value={idleMinutes}
          disabled={!canManage}
          onChange={(e) => setIdleMinutes(e.target.value)}
        />
        <span className={styles.hint}>
          Admin-portal tabs auto sign-out after this many minutes idle or backgrounded.
        </span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="lockoutThreshold">
          Failed logins before lockout
        </label>
        <input
          id="lockoutThreshold"
          type="number"
          min={1}
          className={styles.input}
          value={lockoutThreshold}
          disabled={!canManage}
          onChange={(e) => setLockoutThreshold(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="lockoutMinutes">
          Lockout duration (minutes)
        </label>
        <input
          id="lockoutMinutes"
          type="number"
          min={1}
          className={styles.input}
          value={lockoutMinutes}
          disabled={!canManage}
          onChange={(e) => setLockoutMinutes(e.target.value)}
        />
      </div>

      <label className={styles.toggleRow} htmlFor="maintenanceMode">
        <input
          id="maintenanceMode"
          type="checkbox"
          className={styles.checkbox}
          checked={maintenanceMode}
          disabled={!canManage}
          onChange={(e) => setMaintenanceMode(e.target.checked)}
        />
        Maintenance mode banner (shows a heads-up banner to admin-portal users)
      </label>

      {canManage && (
        <button type="submit" className={styles.primaryBtn} disabled={isPending}>
          {isPending && <Loader2 size={16} className={styles.spin} />}
          Save settings
        </button>
      )}
    </form>
  );
}
