/**
 * Modal dialog with the create/edit form for a user account. Submits via a
 * Server Action (createUser/updateUser) using useActionState. In edit
 * mode, the password field is optional — leaving it blank keeps the
 * user's current password.
 */
"use client";

import React, { useActionState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import clsx from "clsx";
import { createUser, updateUser, type UserFormState } from "@/app/actions/users";
import { PasswordInput } from "@/app/components/PasswordInput";
import styles from "./Users.module.css";

export type RoleOption = {
  id: number;
  name: string;
  slug: string;
};

/** Subset of user fields needed to pre-fill the form when editing. */
export type EditableUser = {
  id: string;
  email: string;
  full_name: string;
  nic: string;
  phone_number: string;
  roleId: number;
  is_active: boolean;
  email_confirmed: boolean;
};

const initialState: UserFormState = {};

/**
 * Renders the user form inside a modal overlay. Picks createUser or
 * updateUser (with the id bound in) based on `mode`, and closes itself
 * once the save succeeds.
 */
export default function UserFormModal({
  mode,
  user,
  roles,
  onClose,
}: {
  mode: "create" | "edit";
  user?: EditableUser;
  roles: RoleOption[];
  onClose: () => void;
}) {
  const action = mode === "create" ? createUser : updateUser.bind(null, user!.id);
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
        <h2 className={styles.modalTitle}>
          {mode === "create" ? "Add User" : "Edit User"}
        </h2>

        {state.error && <div className={styles.banner}>{state.error}</div>}

        <form action={formAction}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={user?.email}
              className={styles.input}
              placeholder="user@example.com"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              defaultValue={user?.full_name}
              className={styles.input}
              placeholder="Jane Doe"
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="nic">
                NIC <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="nic"
                name="nic"
                type="text"
                defaultValue={user?.nic}
                className={styles.input}
                placeholder="e.g. 200012345678"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="phoneNumber">
                Phone number <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                defaultValue={user?.phone_number}
                className={styles.input}
                placeholder="e.g. 0771234567"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password{" "}
              {mode === "edit" && (
                <span className={styles.optional}>
                  (leave blank to keep current)
                </span>
              )}
            </label>
            <PasswordInput
              id="password"
              name="password"
              required={mode === "create"}
              minLength={8}
              className={styles.input}
              placeholder="At least 8 characters"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="role">
              Role
            </label>
            <select
              id="role"
              name="role"
              required
              defaultValue={user?.roleId ?? ""}
              className={styles.select2}
            >
              <option value="" disabled>
                Select a role
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {mode === "edit" && (
            <div className={styles.fieldRow}>
              <div className={clsx(styles.field, styles.checkboxRow)}>
                <input
                  id="isActive"
                  name="isActive"
                  type="checkbox"
                  defaultChecked={user?.is_active ?? true}
                />
                <label htmlFor="isActive">Active</label>
              </div>
              <div className={clsx(styles.field, styles.checkboxRow)}>
                <input
                  id="emailConfirmed"
                  name="emailConfirmed"
                  type="checkbox"
                  defaultChecked={user?.email_confirmed ?? true}
                />
                <label htmlFor="emailConfirmed">Email confirmed</label>
              </div>
            </div>
          )}

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={pending}
            >
              {pending && <Loader2 size={16} className={styles.spin} />}
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>

        <button
          type="button"
          className={styles.iconBtn}
          style={{ position: "absolute", top: "1rem", right: "1rem" }}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
