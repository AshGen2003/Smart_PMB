"use client";

import React, { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import {
  Briefcase,
  Eye,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
import { deleteRole } from "@/app/actions/roles";
import RoleFormModal, { type EditableRole, type PermissionOption } from "./RoleFormModal";
import styles from "./Roles.module.css";

export type RoleRow = {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_system: boolean;
  permissions: string[];
  user_count: number;
};

const TINTS = [styles.tintGreen, styles.tintGold, styles.tintBlue, styles.tintNeutral];
const DECORATIVE_ICONS = [Briefcase, UserCog, Eye];

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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => r.name.toLowerCase().includes(q));
  }, [roles, query]);

  const labelFor = (codename: string) =>
    permissions.find((p) => p.codename === codename)?.label ?? codename;

  function handleDelete(role: RoleRow) {
    if (!window.confirm(`Delete the "${role.name}" role? This cannot be undone.`))
      return;

    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteRole(role.id);
      if (result.error) setDeleteError(result.error);
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

      {deleteError && <div className={styles.banner}>{deleteError}</div>}

      <div className={styles.container}>
        <h2 className={styles.sectionLabel}>All roles</h2>

        {filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((r, i) => {
              const canDelete = !r.is_system && r.user_count === 0;
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
                        r.is_system
                          ? "System roles can't be deleted"
                          : r.user_count > 0
                          ? "Reassign users before deleting this role"
                          : undefined
                      }
                      onClick={() => handleDelete(r)}
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
    </div>
  );
}
