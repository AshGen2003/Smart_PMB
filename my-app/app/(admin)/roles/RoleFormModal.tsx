/**
 * Modal dialog with the create/edit form for a role, including a checklist
 * of every assignable permission codename. Submits via a Server Action
 * (createRole/updateRole) using useActionState.
 */
"use client";

import React, { useActionState, useEffect, useRef } from "react";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { createRole, updateRole, type RoleFormState } from "@/app/actions/roles";
import { DASHBOARD_WIDGET_OPTIONS } from "@/app/lib/dashboardWidgets";
import styles from "./Roles.module.css";

/** A single permission the role checklist can toggle on/off. */
export type PermissionOption = {
  codename: string;
  label: string;
  description: string;
};

/** Subset of role fields needed to pre-fill the form when editing. */
export type EditableRole = {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  dashboard_widgets: string[];
};

const initialState: RoleFormState = {};

/**
 * Renders the role form (name, description, permission checkboxes) inside
 * a modal overlay. Picks createRole or updateRole (with the id bound in)
 * based on `mode`, and closes itself once the save succeeds. All checked
 * "permissions" checkboxes share the `name="permissions"` attribute so the
 * submitted FormData carries them as a repeated field.
 */
export default function RoleFormModal({
  mode,
  role,
  permissions,
  onClose,
}: {
  mode: "create" | "edit";
  role?: EditableRole;
  permissions: PermissionOption[];
  onClose: () => void;
}) {
  const action = mode === "create" ? createRole : updateRole.bind(null, role!.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const wasSubmitting = useRef(false);

  // Auto-close the modal once a pending submission resolves without error.
  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !state.error) {
      onClose();
    }
  }, [pending, state, onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <ShieldCheck size={20} />
            {mode === "create" ? "Create role" : `Edit role — ${role?.name}`}
          </div>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {state.error && <div className={styles.modalBanner}>{state.error}</div>}

          <form action={formAction}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="name">
                Role name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={role?.name}
                className={styles.input}
                placeholder="e.g. Regional Supervisor"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="description">
                Description <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={role?.description}
                className={styles.textarea}
                placeholder="What this role is for"
                rows={2}
              />
            </div>

            <p className={styles.permissionsLabel}>Permissions</p>
            <div className={styles.checkList}>
              {permissions.map((p) => (
                <label key={p.codename} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={p.codename}
                    defaultChecked={role?.permissions.includes(p.codename) ?? false}
                    className={styles.checkbox}
                  />
                  {p.label}
                </label>
              ))}
            </div>

            <p className={styles.permissionsLabel}>
              Officer Dashboard Widgets <span className={styles.optional}>(shown on /dashboard for this role)</span>
            </p>
            <div className={styles.checkList}>
              {DASHBOARD_WIDGET_OPTIONS.map((w) => (
                <label key={w.key} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    name="dashboard_widgets"
                    value={w.key}
                    defaultChecked={role ? role.dashboard_widgets.includes(w.key) : true}
                    className={styles.checkbox}
                  />
                  {w.label}
                </label>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={pending}>
                {pending && <Loader2 size={16} className={styles.spin} />}
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
