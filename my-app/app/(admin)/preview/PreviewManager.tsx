/**
 * Client Component behind `/preview`: a role picker plus a live mockup of
 * that role's sidebar navigation (so an admin can see exactly what a Farmer
 * or PMB Officer's portal looks like) and an "Enter Preview" button that
 * starts a real, read-only preview session as that role. Permission editing
 * lives on `/roles` — this page only mirrors the current permission set to
 * decide which nav items show in the mockup.
 */
"use client";

import { useState } from "react";
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
  Settings,
  LogOut,
  Sprout,
} from "lucide-react";
import { enterPreview } from "@/app/actions/preview";
import sidebarStyles from "@/app/components/Sidebar.module.css";
import styles from "./Preview.module.css";
import type { RoleRow } from "../roles/RolesManager";

// Mirrors Sidebar.tsx's NAV_ITEMS exactly — kept as a separate list here
// (rather than importing Sidebar's, which isn't exported) since this one
// needs each entry's gating permission(s) as plain data to render toggles
// against, not just to filter against the current user's own permissions.
const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, permission: null },
  { label: "Users", icon: Users, permission: "manage_users" },
  { label: "Maintenance", icon: Wrench, permission: "view_audit_logs" },
  { label: "Warehouses", icon: Warehouse, permission: "manage_warehouses" },
  { label: "Pricing", icon: Coins, permission: "manage_pricing" },
  { label: "Approvals", icon: ClipboardCheck, permissions: ["monitor_operations", "record_purchases"] },
  { label: "Reports", icon: BarChart3, permission: "generate_reports" },
  { label: "Roles", icon: ShieldCheck, permission: "manage_roles" },
  { label: "Preview Portal", icon: Eye, permission: "manage_roles" },
  { label: "Messages", icon: MessageSquare, permission: null },
  { label: "Settings", icon: Settings, permission: null },
] as const;

// Every farmer sees this exact, fixed nav — it isn't permission-gated at
// all (see components/FarmerSidebar.tsx), so there's nothing to toggle.
const FARMER_NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Messages", icon: MessageSquare },
  { label: "Settings", icon: Settings },
  { label: "Log out", icon: LogOut },
];

export default function PreviewManager({ roles }: { roles: RoleRow[] }) {
  const sortedRoles = [...roles].sort((a, b) => a.name.localeCompare(b.name));
  const [selectedId, setSelectedId] = useState<number | undefined>(sortedRoles[0]?.id);

  const selected = sortedRoles.find((r) => r.id === selectedId);
  const isFarmerRole = selected?.slug === "farmer";
  const currentPermissions = selected?.permissions ?? [];

  function hasAccess(item: (typeof ADMIN_NAV_ITEMS)[number]) {
    if ("permissions" in item) return item.permissions.some((p) => currentPermissions.includes(p));
    if (item.permission) return currentPermissions.includes(item.permission);
    return true; // no permission field = always visible (Dashboard/Settings)
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
            onClick={() => setSelectedId(r.id)}
          >
            {r.name}
          </button>
        ))}
      </div>

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
                {isFarmerRole
                  ? FARMER_NAV_ITEMS.map((item) => (
                      <span key={item.label} className={sidebarStyles.navItem}>
                        <item.icon className={sidebarStyles.navIcon} size={18} />
                        {item.label}
                      </span>
                    ))
                  : ADMIN_NAV_ITEMS.filter(hasAccess).map((item) => (
                      <span key={item.label} className={sidebarStyles.navItem}>
                        <item.icon className={sidebarStyles.navIcon} size={18} />
                        {item.label}
                      </span>
                    ))}
              </nav>
            </aside>
          </div>
          {isFarmerRole && (
            <p className={styles.mockupNote}>
              <Sprout size={14} /> Farmer navigation is fixed for every farmer — it isn&apos;t
              permission-based.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
