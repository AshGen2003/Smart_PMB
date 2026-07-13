"use client";

import React, { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteUser } from "@/app/actions/users";
import UserFormModal, { type EditableUser, type RoleOption } from "./UserFormModal";
import styles from "./Users.module.css";

export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string;
  nic: string | null;
  role: { id: number; name: string; slug: string };
  is_active: boolean;
  date_joined: string;
};

export default function UsersManager({
  users,
  roles,
  currentUserId,
}: {
  users: AdminUserRow[];
  roles: RoleOption[];
  currentUserId: string;
}) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; user: EditableUser } | null
  >(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  function handleDelete(user: AdminUserRow) {
    if (!window.confirm(`Delete ${user.email}? This cannot be undone.`)) return;

    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (result.error) setDeleteError(result.error);
    });
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

          <select
            className={styles.select}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>

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

      <div className={styles.card}>
        {filtered.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Full Name</th>
                <th>NIC</th>
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
                  <td>
                    <span className={clsx(styles.badge, styles.roleBadge)}>
                      {u.role.name}
                    </span>
                  </td>
                  <td>
                    <span
                      className={clsx(
                        styles.badge,
                        u.is_active ? styles["badge-success"] : styles["badge-neutral"]
                      )}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{format(new Date(u.date_joined), "MMM d, yyyy")}</td>
                  <td>
                    <div className={styles.rowActions}>
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
                              roleId: u.role.id,
                              is_active: u.is_active,
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
        <UserFormModal mode="create" roles={roles} onClose={() => setModal(null)} />
      )}
      {modal?.mode === "edit" && (
        <UserFormModal
          mode="edit"
          roles={roles}
          user={modal.user}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
