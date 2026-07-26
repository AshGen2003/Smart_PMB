/**
 * Client Component behind `/preview`: a role picker plus a live, clickable
 * mockup of that role's sidebar navigation (so an admin can see exactly
 * what any role's portal looks like — admin/officer, farmer, or driver), a
 * per-button switch to grant/revoke that role's access to each sidebar
 * item on the spot, and an "Enter Preview" button that starts a real,
 * read-only preview session as that role. The full role editor (rename,
 * delete, and permissions with no sidebar button of their own, e.g.
 * manage_system) still lives on `/roles` — this page is the quick-toggle
 * view for exactly what shows up in the sidebar.
 */
"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import {
  LayoutDashboard,
  Users,
  Wrench,
  BarChart3,
  ShieldCheck,
  Warehouse,
  Coins,
  ClipboardCheck,
  Eye,
  MessageSquare,
  Truck,
  Info,
  Settings,
  User,
} from "lucide-react";
import { enterPreview } from "@/app/actions/preview";
import { toggleRolePermission } from "@/app/actions/roles";
import sidebarStyles from "@/app/components/Sidebar.module.css";
import styles from "./Preview.module.css";
import type { RoleRow } from "../roles/RolesManager";

// Mirrors Sidebar.tsx's NAV_ITEMS exactly — kept as a separate list here
// (rather than importing Sidebar's, which isn't exported) since this one
// needs each entry's gating permission(s) as plain data to render toggles
// against, not just to filter against the current user's own permissions.
// Every item has a single `permission` except Approvals, which is gated by
// either of two permissions (monitor_operations/record_purchases) — that
// one has no single checkbox to toggle here, edit those two directly via
// the full role editor on /roles instead.
const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, permission: "view_dashboard" },
  { label: "Users", icon: Users, permission: "manage_users" },
  { label: "Maintenance", icon: Wrench, permission: "view_audit_logs" },
  { label: "Warehouses", icon: Warehouse, permission: "manage_warehouses" },
  { label: "Pricing", icon: Coins, permission: "manage_pricing" },
  { label: "Approvals", icon: ClipboardCheck, permissions: ["monitor_operations", "record_purchases"] },
  { label: "Transportation", icon: Truck, permission: "manage_transport" },
  { label: "Reports", icon: BarChart3, permission: "generate_reports" },
  { label: "Roles", icon: ShieldCheck, permission: "manage_roles" },
  { label: "Preview Portal", icon: Eye, permission: "manage_roles" },
  { label: "Messages", icon: MessageSquare, permission: "view_messages" },
  { label: "Settings", icon: Settings, permission: "view_settings" },
  { label: "Profile", icon: User, permission: "view_profile" },
] as const;

// Mirrors FarmerSidebar.tsx's NAV_ITEMS. No "Log out" entry — the real
// sidebar shows that as a static, always-available action with no
// permission gate, so there's nothing to toggle for it here.
const FARMER_NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, permission: "view_dashboard" },
  { label: "Messages", icon: MessageSquare, permission: "view_messages" },
  { label: "Settings", icon: Settings, permission: "view_settings" },
  { label: "Profile", icon: User, permission: "view_profile" },
] as const;

// Mirrors DriverSidebar.tsx's NAV_ITEMS. Same "no Log out entry" note as
// farmer above.
const DRIVER_NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, permission: "view_dashboard" },
  { label: "Vehicle Details", icon: Info, permission: "view_vehicle_details" },
  { label: "Vehicle Log", icon: Truck, permission: "view_vehicle_log" },
  { label: "Messages", icon: MessageSquare, permission: "view_messages" },
  { label: "Settings", icon: Settings, permission: "view_settings" },
  { label: "Profile", icon: User, permission: "view_profile" },
] as const;

export default function PreviewManager({ roles }: { roles: RoleRow[] }) {
  const sortedRoles = [...roles].sort((a, b) => a.name.localeCompare(b.name));
  const [selectedId, setSelectedId] = useState<number | undefined>(sortedRoles[0]?.id);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = sortedRoles.find((r) => r.id === selectedId);
  const currentPermissions = selected?.permissions ?? [];
  const items =
    selected?.slug === "farmer"
      ? FARMER_NAV_ITEMS
      : selected?.slug === "driver"
      ? DRIVER_NAV_ITEMS
      : ADMIN_NAV_ITEMS;

  function handleToggle(codename: string, checked: boolean) {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await toggleRolePermission(selected.id, codename, currentPermissions, checked);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Portal Preview</h1>
        <p className={styles.subtitle}>
          See what each role&apos;s navigation looks like, and grant or revoke access without
          leaving this page.
        </p>
      </div>

      <div className={styles.roleTabs}>
        {sortedRoles.map((r) => (
          <button
            key={r.id}
            type="button"
            className={clsx(styles.roleTab, r.id === selectedId && styles.roleTabActive)}
            onClick={() => {
              setSelectedId(r.id);
              setError(null);
            }}
          >
            {r.name}
          </button>
        ))}
      </div>

      {error && <div className={styles.banner}>{error}</div>}

      {selected && (
        <div className={styles.mockupWrap}>
          <div className={styles.mockupHeaderRow}>
            <span className={styles.mockupLabel}>What {selected.name} sees</span>
            <form action={enterPreview.bind(null, selected.slug)}>
              <button type="submit" className={styles.enterPreviewBtn}>
                <Eye size={14} /> Enter Preview
              </button>
            </form>
          </div>
          <div className={styles.mockupFrame}>
            <aside className={sidebarStyles.sidebar} style={{ width: "100%", height: "100%" }}>
              <div className={sidebarStyles.logoArea}>
                <span>Smart PMB</span>
              </div>
              <nav className={sidebarStyles.nav}>
                {items.map((item) => {
                  const isOrGated = "permissions" in item;
                  const checked = isOrGated
                    ? item.permissions.some((p) => currentPermissions.includes(p))
                    : currentPermissions.includes(item.permission);

                  return (
                    <label
                      key={item.label}
                      className={clsx(
                        sidebarStyles.navItem,
                        styles.toggleRow,
                        !checked && styles.toggleRowOff
                      )}
                    >
                      <item.icon className={sidebarStyles.navIcon} size={18} />
                      <span className={styles.toggleLabel}>{item.label}</span>
                      {isOrGated ? (
                        <span
                          className={styles.toggleHint}
                          title="Edit monitor_operations/record_purchases on /roles"
                        >
                          —
                        </span>
                      ) : (
                        <span className={styles.switchTrack}>
                          <input
                            type="checkbox"
                            className={styles.switchInput}
                            checked={checked}
                            disabled={isPending}
                            onChange={(e) => handleToggle(item.permission, e.target.checked)}
                          />
                          <span className={styles.switchSlider} />
                        </span>
                      )}
                    </label>
                  );
                })}
              </nav>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
