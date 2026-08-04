/**
 * Client Component for the roles page: a searchable card grid of roles
 * with their assigned permissions, plus create/edit/delete via a modal
 * form and Server Actions. A role can only be deleted once it has no
 * users currently assigned to it — including built-in system roles
 * (Admin/PMB Officer/Farmer/...), which show an extra warning in the
 * delete-confirmation dialog since some backend flows look a role up by
 * its slug (see accounts/models.py's Role.is_system docstring).
 */
"use client";

import React, { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Briefcase,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { deleteRole } from "@/app/actions/roles";
import RoleFormModal, { type EditableRole, type PermissionOption } from "./RoleFormModal";
import styles from "./Roles.module.css";

/** Shape of a role row as returned by `GET /api/admin/roles/`. */
export type RoleRow = {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_system: boolean;
  permissions: string[];
  user_count: number;
  dashboard_widgets: string[];
};

// Cycle a few tint classes and decorative icons across the role cards for
// visual variety; system roles always get the shield icon.
const TINTS = [styles.tintGreen, styles.tintGold, styles.tintBlue, styles.tintNeutral];
const DECORATIVE_ICONS = [Briefcase, UserCog, Eye];

/** Renders the search bar and the role card grid; owns the create/edit modal and delete-confirmation flow. */
export default function RolesManager({
  roles,
  permissions,
}: {
  roles: RoleRow[];
  permissions: PermissionOption[];
}) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; role: EditableRole } | null
  >(null);
  // Role pending delete confirmation — opens the confirm dialog below
  // rather than a native window.confirm(), so a system role can show its
  // extra warning inline.
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => r.name.toLowerCase().includes(q));
  }, [roles, query]);

  // Permission codenames (e.g. "manage_users") are stored on the role;
  // look up the human-readable label from the master permissions list.
  const labelFor = (codename: string) =>
    permissions.find((p) => p.codename === codename)?.label ?? codename;

  function openDeleteConfirm(role: RoleRow) {
    setDeleteError(null);
    setDeleteSuccess(null);
    setDeleteTarget(role);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;

    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteRole(target.id);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setDeleteTarget(null);
      setDeleteSuccess(`The "${target.name}" role was deleted.`);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Roles &amp; Permissions</h1>

        <div className={styles.headerActions}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search roles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={styles.newRoleBtn}
            onClick={() => setModal({ mode: "create" })}
          >
            <Plus size={16} /> New role
          </button>
        </div>
      </div>

      {deleteSuccess && <div className={styles.successBanner}>{deleteSuccess}</div>}

      <div className={styles.container}>
        <h2 className={styles.sectionLabel}>All roles</h2>

        {filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((r, i) => {
              // Any role — including built-in system roles — can be
              // deleted once no users are assigned to it (see
              // RolesManager's file docstring for why system roles get an
              // extra confirmation warning instead of being blocked).
              const canDelete = r.user_count === 0;
              const tint = TINTS[i % TINTS.length];
              const Icon = r.is_system
                ? ShieldCheck
                : DECORATIVE_ICONS[i % DECORATIVE_ICONS.length];

              return (
                <div key={r.id} className={clsx(styles.roleCard, tint)}>
                  <div className={styles.roleCardHeader}>
                    <div className={styles.roleTitleRow}>
                      <span className={styles.roleIcon}>
                        <Icon size={18} />
                      </span>
                      <span className={styles.roleName}>{r.name}</span>
                    </div>
                    <span className={styles.userCount}>
                      {r.user_count} user{r.user_count === 1 ? "" : "s"}
                    </span>
                  </div>

                  {r.description && (
                    <p className={styles.roleDescription}>{r.description}</p>
                  )}

                  <div className={styles.permList}>
                    {r.permissions.length > 0 ? (
                      r.permissions.map((codename) => (
                        <div key={codename} className={styles.permItem}>
                          <span className={styles.permDot} />
                          <span>{labelFor(codename)}</span>
                        </div>
                      ))
                    ) : (
                      <span className={styles.permEmpty}>No permissions granted</span>
                    )}
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() =>
                        setModal({
                          mode: "edit",
                          role: {
                            id: r.id,
                            name: r.name,
                            description: r.description,
                            permissions: r.permissions,
                            dashboard_widgets: r.dashboard_widgets,
                          },
                        })
                      }
                    >
                      <Pencil size={14} /> Edit permissions
                    </button>
                    <button
                      type="button"
                      className={styles.deleteIconBtn}
                      aria-label="Delete role"
                      disabled={!canDelete || isPending}
                      title={
                        r.user_count > 0 ? "Reassign users before deleting this role" : undefined
                      }
                      onClick={() => openDeleteConfirm(r)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyState}>No roles match your search.</p>
        )}
      </div>

      {modal?.mode === "create" && (
        <RoleFormModal mode="create" permissions={permissions} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "edit" && (
        <RoleFormModal
          mode="edit"
          role={modal.role}
          permissions={permissions}
          onClose={() => setModal(null)}
        />
      )}

      {deleteTarget && (
        <div className={styles.overlay} onClick={() => !isPending && setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <Trash2 size={20} />
                Delete role
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setDeleteTarget(null)}
                disabled={isPending}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {deleteError && <div className={styles.modalBanner}>{deleteError}</div>}

              <p>
                Delete the <strong>{deleteTarget.name}</strong> role? This cannot be undone.
              </p>

              {deleteTarget.is_system && (
                <div className={styles.warningBox}>
                  <AlertTriangle size={16} />
                  <span>
                    This is a built-in system role. Some features look it up by name
                    (e.g. new-account signup, license approval, or appointing staff into this
                    role) — deleting it may break those flows even though no users currently
                    hold it.
                  </span>
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setDeleteTarget(null)}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.dangerBtn}
                  onClick={confirmDelete}
                  disabled={isPending}
                >
                  {isPending && <Loader2 size={16} className={styles.spin} />}
                  Delete role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
