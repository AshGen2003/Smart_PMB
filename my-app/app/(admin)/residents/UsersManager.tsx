/**
 * Client Component for the user management table: search/filter by role,
 * create/edit users via a modal, and per-row actions (unlock account,
 * reset password, force logout, delete). The unlock/reset-password/
 * force-logout actions are only shown to users with `manage_system` (see
 * `canManageSystem`), since they affect another account's credentials or
 * active sessions.
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import { KeyRound, LogOut, Pencil, Plus, Search, Trash2, Unlock, UserCog } from "lucide-react";
import { deleteUser, forceLogoutUser, resetUserPassword, unlockUser } from "@/app/actions/users";
import { overrideImpersonation, requestImpersonationOtp, startImpersonation } from "@/app/actions/impersonation";
import UserFormModal, { type DistrictOption, type EditableUser, type RoleOption } from "./UserFormModal";
import DeleteUserModal from "./DeleteUserModal";
import ImpersonateConfirmModal from "./ImpersonateConfirmModal";
import StyledSelect from "@/app/components/StyledSelect";
import Toast, { type ToastState } from "@/app/components/Toast";
import styles from "./Users.module.css";

/** Shape of a user row as returned by `GET /api/admin/users/`. */
export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string;
  nic: string | null;
  phone_number: string | null;
  role: { id: number; name: string; slug: string };
  is_active: boolean;
  email_confirmed: boolean;
  date_joined: string;
  last_activity: string | null;
  is_locked: boolean;
  employee_no: string | null;
  designation: string | null;
  district: number | null;
};

/**
 * Renders the searchable/filterable user table plus the create/edit modal.
 * `currentUserId` is used to prevent a user from deleting/force-logging-out
 * themself; `canManageSystem` gates the unlock/force-logout controls;
 * `canImpersonate` (impersonate_users permission) gates the Impersonate
 * button, itself hidden for the current user's own row and for any
 * admin-role row (backend enforces the same rejections either way — see
 * accounts/views.py's AdminUserViewSet.impersonate).
 */
export default function UsersManager({
  users,
  roles,
  districts,
  currentUserId,
  canManageSystem,
  canImpersonate,
  canOverrideImpersonation,
}: {
  users: AdminUserRow[];
  roles: RoleOption[];
  districts: DistrictOption[];
  currentUserId: string;
  canManageSystem: boolean;
  canImpersonate: boolean;
  canOverrideImpersonation: boolean;
}) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; user: EditableUser } | null
  >(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<AdminUserRow | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  // Client-side filter combining the role dropdown and free-text search
  // (name, email, or NIC) — both must match for a row to be shown.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role.slug !== roleFilter) return false;
      if (!q) return true;
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nic ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, query]);

  // Opens the confirmation modal rather than deleting immediately — see
  // confirmDelete below for the actual delete + result toast.
  function handleDelete(user: AdminUserRow) {
    setDeleteTarget(user);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;

    startTransition(async () => {
      const result = await deleteUser(target.id);
      setDeleteTarget(null);
      if (result.error) {
        setToast({ type: "error", message: `Couldn't delete ${target.email}: ${result.error}` });
      } else {
        setToast({ type: "success", message: `${target.email} was permanently deleted.` });
      }
    });
  }

  function handleUnlock(user: AdminUserRow) {
    setDeleteError(null);
    setActionMessage(null);
    startTransition(async () => {
      const result = await unlockUser(user.id);
      if (result.error) setDeleteError(result.error);
      else setActionMessage(`${user.email} unlocked.`);
    });
  }

  function handleResetPassword(user: AdminUserRow) {
    if (!window.confirm(`Reset ${user.email}'s password? A new temporary password will be emailed to them.`)) return;

    setDeleteError(null);
    setActionMessage(null);
    startTransition(async () => {
      const result = await resetUserPassword(user.id);
      if (result.error) setDeleteError(result.error);
      else setActionMessage(`${user.email}'s password was reset and emailed to them.`);
    });
  }

  function handleForceLogout(user: AdminUserRow) {
    if (!window.confirm(`Force-logout ${user.email} from all devices?`)) return;

    setDeleteError(null);
    setActionMessage(null);
    startTransition(async () => {
      const result = await forceLogoutUser(user.id);
      if (result.error) setDeleteError(result.error);
      else setActionMessage(`${user.email} signed out everywhere.`);
    });
  }

  // Opens the confirmation modal rather than impersonating immediately —
  // the modal itself drives the two-step request-code/enter-code flow via
  // the two handlers below, so it can show errors inline and let the admin
  // retry a wrong code without losing the modal's state.
  function handleImpersonate(user: AdminUserRow) {
    setImpersonateTarget(user);
  }

  async function handleRequestImpersonationOtp(): Promise<{ error?: string }> {
    if (!impersonateTarget) return { error: "No account selected." };
    return requestImpersonationOtp(impersonateTarget.id);
  }

  async function confirmImpersonate(code: string): Promise<{ error?: string } | void> {
    if (!impersonateTarget) return;
    // Redirects on success (never returns) — only returns here on failure.
    return startImpersonation(impersonateTarget.id, code);
  }

  async function handleOverrideImpersonation(reason: string): Promise<{ error?: string } | void> {
    if (!impersonateTarget) return;
    // Redirects on success (never returns) — only returns here on failure.
    return overrideImpersonation(impersonateTarget.id, reason);
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>User Management</h1>
          <span className={styles.subtitle}>
            {users.length} account{users.length === 1 ? "" : "s"} across all roles
          </span>
        </div>

        <div className={styles.actions}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search name, email, or NIC"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <StyledSelect
            fitContent
            value={roleFilter}
            onChange={setRoleFilter}
            options={[{ value: "all", label: "All roles" }, ...roles.map((r) => ({ value: r.slug, label: r.name }))]}
          />

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setModal({ mode: "create" })}
          >
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      {deleteError && <div className={styles.banner}>{deleteError}</div>}
      {actionMessage && <div className={styles.successBanner}>{actionMessage}</div>}

      <div className={styles.card}>
        {filtered.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Full Name</th>
                <th>NIC</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.full_name || "—"}</td>
                  <td>{u.nic || "—"}</td>
                  <td>{u.phone_number || "—"}</td>
                  <td>
                    <span className={clsx(styles.badge, styles.roleBadge)}>
                      {u.role.name}
                    </span>
                  </td>
                  <td>
                    <div className={styles.statusCell}>
                      <span
                        className={clsx(
                          styles.badge,
                          u.is_active ? styles["badge-success"] : styles["badge-neutral"]
                        )}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                      {u.is_locked && (
                        <span className={clsx(styles.badge, styles["badge-danger"])}>
                          Locked
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{format(new Date(u.date_joined), "MMM d, yyyy")}</td>
                  <td>
                    <div className={styles.rowActions}>
                      {canManageSystem && u.is_locked && (
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label="Unlock account"
                          title="Unlock account"
                          disabled={isPending}
                          onClick={() => handleUnlock(u)}
                        >
                          <Unlock size={16} />
                        </button>
                      )}
                      {canManageSystem && (
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label="Reset password"
                          title="Reset password (emails a new temporary one)"
                          disabled={isPending}
                          onClick={() => handleResetPassword(u)}
                        >
                          <KeyRound size={16} />
                        </button>
                      )}
                      {/* Can't force-logout your own account from this screen. */}
                      {canManageSystem && u.id !== currentUserId && (
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label="Force logout"
                          title="Force logout from all devices"
                          disabled={isPending}
                          onClick={() => handleForceLogout(u)}
                        >
                          <LogOut size={16} />
                        </button>
                      )}
                      {canImpersonate && u.id !== currentUserId && u.role.slug !== "admin" && (
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label="Impersonate"
                          title="Sign in as this account for support/debugging"
                          disabled={isPending}
                          onClick={() => handleImpersonate(u)}
                        >
                          <UserCog size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label="Edit user"
                        onClick={() =>
                          setModal({
                            mode: "edit",
                            user: {
                              id: u.id,
                              email: u.email,
                              full_name: u.full_name,
                              nic: u.nic ?? "",
                              phone_number: u.phone_number ?? "",
                              roleId: u.role.id,
                              is_active: u.is_active,
                              email_confirmed: u.email_confirmed,
                              designation: u.designation,
                              district: u.district,
                            },
                          })
                        }
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className={clsx(styles.iconBtn, styles.iconBtnDanger)}
                        aria-label="Delete user"
                        disabled={u.id === currentUserId || isPending}
                        onClick={() => handleDelete(u)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyState}>No users match this filter.</p>
        )}
      </div>

      {modal?.mode === "create" && (
        <UserFormModal mode="create" roles={roles} districts={districts} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "edit" && (
        <UserFormModal
          mode="edit"
          roles={roles}
          districts={districts}
          user={modal.user}
          onClose={() => setModal(null)}
        />
      )}

      {deleteTarget && (
        <DeleteUserModal
          email={deleteTarget.email}
          fullName={deleteTarget.full_name}
          pending={isPending}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {impersonateTarget && (
        <ImpersonateConfirmModal
          email={impersonateTarget.email}
          canOverride={canOverrideImpersonation}
          onRequestCode={handleRequestImpersonationOtp}
          onConfirm={confirmImpersonate}
          onOverride={handleOverrideImpersonation}
          onClose={() => setImpersonateTarget(null)}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
