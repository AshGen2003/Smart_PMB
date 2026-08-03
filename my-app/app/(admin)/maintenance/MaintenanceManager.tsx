/**
 * Client Component for the maintenance console: tabbed views for alerts,
 * audit log, login activity, backups, and system settings. `canManage`
 * (manage_system permission) toggles whether mutation controls (resolve
 * alert, run backup, save settings) are shown/enabled.
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import {
  AlertTriangle,
  Bug,
  Check,
  Database,
  Download,
  History,
  Loader2,
  ScrollText,
  Search,
  Settings2,
  User,
  X,
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

// General-purpose activity/error monitoring row: one unhandled exception
// from anywhere in the API, captured automatically (see
// sysops/exception_handler.py) rather than a hand-picked business action
// like AuditLog.
export type ErrorLogRow = {
  id: number;
  actor: string;
  method: string;
  path: string;
  exception_type: string;
  message: string;
  status_code: number | null;
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
  payments_enabled: boolean;
  sms_enabled: boolean;
  signups_enabled: boolean;
};

const AUTH_ACTION_LABEL: Record<AuthLogRow["action"], string> = {
  login_success: "Login",
  login_failed: "Failed login",
  account_locked: "Account locked",
  logout: "Logout",
};

/** Formats an ISO date string for display, e.g. "Jul 16, 2026 3:45 PM". */
function fmt(dateStr: string) {
  return format(new Date(dateStr), "MMM d, yyyy h:mm a");
}

/** Formats a byte count as a human-readable KB/MB string for backup sizes. */
function formatBytes(bytes: number) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
}

const TABS = [
  { key: "alerts", label: "Alerts", icon: AlertTriangle },
  { key: "audit", label: "Audit Log", icon: ScrollText },
  { key: "auth", label: "Login Activity", icon: History },
  { key: "errors", label: "Errors", icon: Bug },
  { key: "backups", label: "Backups", icon: Database },
  { key: "settings", label: "Settings", icon: Settings2 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** Renders the tab bar plus the active tab's table/form; owns the shared error/success/pending state for all mutation actions. */
export default function MaintenanceManager({
  auditLogs,
  authLogs,
  errorLogs,
  alerts,
  backups,
  config,
  canManage,
}: {
  auditLogs: AuditLogRow[];
  authLogs: AuthLogRow[];
  errorLogs: ErrorLogRow[];
  alerts: AlertRow[];
  backups: BackupRow[];
  config: SystemConfigData;
  canManage: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("alerts");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Actor string (email, or "System") whose full activity trail is shown
  // in the drill-down modal below — filtered client-side from the same
  // (already fully loaded, capped-at-200) auditLogs list this tab already
  // renders, so opening it needs no extra request.
  const [userTrailActor, setUserTrailActor] = useState<string | null>(null);

  const userTrailEntries = useMemo(
    () => (userTrailActor ? auditLogs.filter((l) => l.actor === userTrailActor) : []),
    [auditLogs, userTrailActor]
  );

  // The Audit Log tab shows one row per actor rather than one row per
  // entry — a heavy actor (e.g. an admin doing far more than anyone else)
  // would otherwise flood the table with hundreds of near-identical rows.
  // Each group summarizes its actor's activity and links into the same
  // per-actor drill-down modal userTrailEntries/userTrailActor already
  // power. auditLogs arrives most-recent-first (backend ordering), so the
  // first entry seen for an actor is also their most recent.
  const auditGroups = useMemo(() => {
    const groups = new Map<
      string,
      { actor: string; count: number; lastAction: string; lastModule: string; lastAt: string }
    >();
    for (const log of auditLogs) {
      const existing = groups.get(log.actor);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(log.actor, {
          actor: log.actor,
          count: 1,
          lastAction: log.action,
          lastModule: log.module,
          lastAt: log.created_at,
        });
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [auditLogs]);

  // Email whose full login-activity trail is shown in a drill-down modal —
  // same pattern as userTrailActor/userTrailEntries above, filtered
  // client-side from the same already-loaded authLogs list.
  const [authTrailEmail, setAuthTrailEmail] = useState<string | null>(null);

  const authTrailEntries = useMemo(
    () => (authTrailEmail ? authLogs.filter((l) => l.email === authTrailEmail) : []),
    [authLogs, authTrailEmail]
  );

  // Same reasoning as auditGroups: an account that logs in/out constantly
  // (or an admin being repeatedly targeted by failed-login attempts) would
  // otherwise flood the table with one row per event. Grouped by email,
  // one row per account, with a failedCount surfaced separately since a
  // spike in failed logins for one account is the thing actually worth an
  // admin's attention. authLogs arrives most-recent-first, so the first
  // entry seen per email is also their most recent.
  const authGroups = useMemo(() => {
    const groups = new Map<
      string,
      { email: string; count: number; failedCount: number; lastAction: AuthLogRow["action"]; lastAt: string }
    >();
    for (const log of authLogs) {
      const key = log.email || "—";
      const existing = groups.get(key);
      const isFailed = log.action === "login_failed" || log.action === "account_locked";
      if (existing) {
        existing.count += 1;
        if (isFailed) existing.failedCount += 1;
      } else {
        groups.set(key, {
          email: key,
          count: 1,
          failedCount: isFailed ? 1 : 0,
          lastAction: log.action,
          lastAt: log.created_at,
        });
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [authLogs]);

  const openAlertCount = useMemo(
    () => alerts.filter((a) => a.status === "open").length,
    [alerts]
  );

  // One search box, reused across the audit/auth/errors tabs (each has its
  // own matching fields below) — cleared automatically on tab switch so a
  // query typed on one tab doesn't silently filter another.
  const [search, setSearch] = useState("");

  const filteredAuditGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return auditGroups;
    return auditGroups.filter(
      (g) =>
        g.actor.toLowerCase().includes(q) ||
        g.lastAction.toLowerCase().includes(q) ||
        g.lastModule.toLowerCase().includes(q)
    );
  }, [auditGroups, search]);

  const filteredAuthGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return authGroups;
    return authGroups.filter(
      (g) => g.email.toLowerCase().includes(q) || g.lastAction.toLowerCase().includes(q)
    );
  }, [authGroups, search]);

  const filteredErrorLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return errorLogs;
    return errorLogs.filter(
      (e) =>
        e.actor.toLowerCase().includes(q) ||
        (e.method || "").toLowerCase().includes(q) ||
        (e.path || "").toLowerCase().includes(q) ||
        (e.exception_type || "").toLowerCase().includes(q) ||
        (e.message || "").toLowerCase().includes(q)
    );
  }, [errorLogs, search]);

  function switchTab(key: TabKey) {
    setTab(key);
    setSearch("");
  }

  // Shared wrapper for alert/backup/settings Server Actions: clears
  // previous banners, runs the action in a transition, and shows either
  // the returned error or a caller-supplied success message.
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
              onClick={() => switchTab(t.key)}
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

      {(tab === "audit" || tab === "auth" || tab === "errors") && (
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={
              tab === "audit"
                ? "Search by actor, action, or module…"
                : tab === "auth"
                ? "Search by email or action…"
                : "Search by actor, path, or exception…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

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
          {filteredAuditGroups.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Actor</th>
                    <th>Activities</th>
                    <th>Last action</th>
                    <th>Last module</th>
                    <th>Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditGroups.map((group) => (
                    <tr key={group.actor}>
                      <td>
                        {group.actor && group.actor !== "System" ? (
                          <button
                            type="button"
                            className={styles.actorLink}
                            onClick={() => setUserTrailActor(group.actor)}
                            title={`View ${group.actor}'s activity`}
                          >
                            {group.actor}
                          </button>
                        ) : (
                          group.actor
                        )}
                      </td>
                      <td>
                        <span className={clsx(styles.badge, styles["badge-neutral"])}>{group.count}</span>
                      </td>
                      <td>{group.lastAction.replaceAll("_", " ")}</td>
                      <td>{group.lastModule}</td>
                      <td>{fmt(group.lastAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <ScrollText size={28} />
              <p>{search ? "No actors match your search." : "No audit activity yet."}</p>
            </div>
          )}
        </div>
      )}

      {tab === "auth" && (
        <div className={styles.container}>
          {filteredAuthGroups.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Activity</th>
                    <th>Failed logins</th>
                    <th>Last action</th>
                    <th>Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuthGroups.map((group) => (
                    <tr key={group.email}>
                      <td>
                        {group.email && group.email !== "—" ? (
                          <button
                            type="button"
                            className={styles.actorLink}
                            onClick={() => setAuthTrailEmail(group.email)}
                            title={`View ${group.email}'s login activity`}
                          >
                            {group.email}
                          </button>
                        ) : (
                          group.email
                        )}
                      </td>
                      <td>
                        <span className={clsx(styles.badge, styles["badge-neutral"])}>{group.count}</span>
                      </td>
                      <td>
                        {group.failedCount > 0 ? (
                          <span className={clsx(styles.badge, styles["badge-critical"])}>
                            {group.failedCount}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span
                          className={clsx(
                            styles.badge,
                            group.lastAction === "login_success"
                              ? styles["badge-success"]
                              : group.lastAction === "logout"
                              ? styles["badge-neutral"]
                              : styles["badge-critical"]
                          )}
                        >
                          {AUTH_ACTION_LABEL[group.lastAction]}
                        </span>
                      </td>
                      <td>{fmt(group.lastAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <History size={28} />
              <p>{search ? "No accounts match your search." : "No login activity recorded yet."}</p>
            </div>
          )}
        </div>
      )}

      {tab === "errors" && (
        <div className={styles.container}>
          {filteredErrorLogs.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Actor</th>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Exception</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredErrorLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.actor}</td>
                      <td>{log.method || "—"}</td>
                      <td>{log.path || "—"}</td>
                      <td>{log.exception_type || "—"}</td>
                      <td style={{ whiteSpace: "normal" }}>{log.message || "—"}</td>
                      <td>
                        {log.status_code ? (
                          <span
                            className={clsx(
                              styles.badge,
                              log.status_code >= 500 ? styles["badge-critical"] : styles["badge-warning"]
                            )}
                          >
                            {log.status_code}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{fmt(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Bug size={28} />
              <p>{search ? "No errors match your search." : "No errors recorded yet."}</p>
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
                    <th></th>
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
                      <td>
                        {b.status === "completed" && (
                          <a
                            href={`/api/backups/${b.id}/download`}
                            className={styles.iconBtn}
                            title="Download"
                            aria-label="Download backup"
                          >
                            <Download size={14} />
                          </a>
                        )}
                      </td>
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

      {userTrailActor && (
        <div className={styles.overlay} onClick={() => setUserTrailActor(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <User size={20} />
                Activity — {userTrailActor}
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setUserTrailActor(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {userTrailEntries.length > 0 ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Module</th>
                        <th>Details</th>
                        <th>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userTrailEntries.map((log) => (
                        <tr key={log.id}>
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
                  <p>No activity found for this user in the current log window.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {authTrailEmail && (
        <div className={styles.overlay} onClick={() => setAuthTrailEmail(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <History size={20} />
                Login activity — {authTrailEmail}
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setAuthTrailEmail(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {authTrailEntries.length > 0 ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>IP Address</th>
                        <th>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {authTrailEntries.map((log) => (
                        <tr key={log.id}>
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
                  <p>No login activity found for this account in the current log window.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Global system settings form (idle logout timeout, login lockout policy,
 * maintenance-mode banner toggle). Inputs are disabled for users without
 * `manage_system` so they can view but not change the values; `onSave`
 * hands the (string-encoded) form values up to the parent's runAction/
 * updateSystemConfig Server Action.
 */
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
  const [paymentsEnabled, setPaymentsEnabled] = useState(config.payments_enabled);
  const [smsEnabled, setSmsEnabled] = useState(config.sms_enabled);
  const [signupsEnabled, setSignupsEnabled] = useState(config.signups_enabled);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      idle_logout_minutes: idleMinutes,
      login_lockout_threshold: lockoutThreshold,
      login_lockout_minutes: lockoutMinutes,
      maintenance_mode: String(maintenanceMode),
      payments_enabled: String(paymentsEnabled),
      sms_enabled: String(smsEnabled),
      signups_enabled: String(signupsEnabled),
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
        Maintenance mode (locks everyone except admins out of the app)
      </label>

      <label className={styles.toggleRow} htmlFor="paymentsEnabled">
        <input
          id="paymentsEnabled"
          type="checkbox"
          className={styles.checkbox}
          checked={paymentsEnabled}
          disabled={!canManage}
          onChange={(e) => setPaymentsEnabled(e.target.checked)}
        />
        Payments enabled (turn off to pause new Stripe checkout sessions)
      </label>

      <label className={styles.toggleRow} htmlFor="smsEnabled">
        <input
          id="smsEnabled"
          type="checkbox"
          className={styles.checkbox}
          checked={smsEnabled}
          disabled={!canManage}
          onChange={(e) => setSmsEnabled(e.target.checked)}
        />
        SMS enabled (turn off to pause all outbound SMS, including OTPs)
      </label>

      <label className={styles.toggleRow} htmlFor="signupsEnabled">
        <input
          id="signupsEnabled"
          type="checkbox"
          className={styles.checkbox}
          checked={signupsEnabled}
          disabled={!canManage}
          onChange={(e) => setSignupsEnabled(e.target.checked)}
        />
        New signups enabled (turn off to pause farmer/purchaser/mill self-registration)
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
