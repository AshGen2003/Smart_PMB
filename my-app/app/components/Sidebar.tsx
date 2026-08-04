/**
 * Collapsible left navigation for the admin/officer shell. Each nav item
 * can declare a required `permission` (single codename) or `permissions`
 * (any-of list). For most items this is real access control — the same
 * permission also gates the page server-side via requirePermission()/
 * requireAnyPermission(), so hiding a link here isn't the only thing
 * stopping direct navigation. The four view_dashboard/view_messages/
 * view_settings/view_profile permissions are the exception: they only
 * control whether the button shows in this sidebar (and in the Preview
 * Portal mockup) — there's deliberately no matching server-side gate on
 * those four pages, since Dashboard is the fallback redirect target for
 * every other denied page (requirePermission would loop), and Profile/
 * Settings/Messages are basic account pages nobody should ever be fully
 * locked out of, even if their sidebar button is hidden.
 */
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLayout } from "./LayoutProvider";
import styles from "./Sidebar.module.css";
import clsx from "clsx";
import {
  LayoutDashboard,
  Users,
  Wrench,
  BarChart3,
  Settings,
  ShieldCheck,
  Warehouse,
  Coins,
  ClipboardCheck,
  FileCheck,
  Package,
  Eye,
  MessageSquare,
  Truck,
  ChevronLeft,
  ChevronRight,
  User,
  BadgeCheck,
  FileCheck,
  Package,
  Receipt,
} from "lucide-react";

// Full set of possible sidebar links. `permission` gates a link behind a
// single codename; `permissions` gates it behind any one of several
// codenames (e.g. Approvals is visible to either monitor_operations or
// record_purchases holders). Every item is gated by something — even
// Dashboard/Messages/Settings have a (normally-granted-to-everyone)
// view_* permission, so every button can be toggled per role from either
// the Role edit form or the Preview Portal's quick-toggle checklist.
const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "view_dashboard" },
  { label: "Users", href: "/residents", icon: Users, permission: "manage_users" },
  {
    label: "Maintenance",
    href: "/maintenance",
    icon: Wrench,
    permission: "view_audit_logs",
  },
  {
    label: "Warehouses",
    href: "/warehouses",
    icon: Warehouse,
    permission: "manage_warehouses",
  },
  { label: "Pricing", href: "/pricing", icon: Coins, permission: "manage_pricing" },
  {
    label: "Approvals",
    href: "/approvals",
    icon: ClipboardCheck,
    permissions: ["monitor_operations", "record_purchases"],
  },
  {
    label: "Licenses",
    href: "/licenses",
    icon: FileCheck,
    permissions: ["monitor_operations", "approve_licenses"],
  },
  {
    label: "Rice Requests",
    href: "/purchase-requests",
    icon: Package,
    permissions: ["monitor_operations", "record_purchases"],
  },
  { label: "Transportation", href: "/transportation", icon: Truck, permission: "manage_transport" },
  { label: "Licenses", href: "/licenses", icon: BadgeCheck, permission: "approve_licenses" },
  {
    label: "Mill Licenses",
    href: "/mill-licenses",
    icon: FileCheck,
    permissions: ["monitor_operations", "approve_licenses"],
  },
  {
    label: "Rice Requests",
    href: "/purchase-requests",
    icon: Package,
    permissions: ["monitor_operations", "record_purchases"],
  },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "generate_reports" },
  {
    label: "System Requests",
    href: "/system-requests",
    icon: Receipt,
    permission: "manage_system_requests",
  },
  {
    label: "My Requests",
    href: "/system-requests/mine",
    icon: Receipt,
    permission: "request_system_changes",
  },
  { label: "Roles", href: "/roles", icon: ShieldCheck, permission: "manage_roles" },
  { label: "Preview Portal", href: "/preview", icon: Eye, permission: "manage_roles" },
  { label: "Messages", href: "/messages", icon: MessageSquare, permission: "view_messages" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "view_settings" },
] as const;

/**
 * hrefs that should show a small red dot on their nav icon when the
 * matching count is positive — Messages (unread count) and the two
 * System Requests entries (admin's pending queue / officer's
 * payment-pending requests, see (admin)/layout.tsx for how each count is
 * computed). A dot is a presence signal only (no number), so both
 * "System Requests" and "My Requests" key off the same count — a given
 * user only ever sees one of the two links anyway (see each item's
 * `permission` above).
 */
function dotHrefs(unreadMessageCount: number, pendingRequestCount: number): Set<string> {
  const hrefs = new Set<string>();
  if (unreadMessageCount > 0) hrefs.add("/messages");
  if (pendingRequestCount > 0) {
    hrefs.add("/system-requests");
    hrefs.add("/system-requests/mine");
  }
  return hrefs;
}

/** Renders the logo, collapse toggle, and the nav links visible to the current user's permission set, highlighting the active route. */
export default function Sidebar({
  permissions,
  unreadMessageCount = 0,
  pendingRequestCount = 0,
}: {
  permissions: string[];
  unreadMessageCount?: number;
  pendingRequestCount?: number;
}) {
  const pathname = usePathname();
  const { isSidebarOpen, toggleSidebar, closeMobileSidebar } = useLayout();

  // Filter the full nav list down to what this user's permissions allow.
  const items = NAV_ITEMS.filter((item) => {
    if ("permissions" in item) return item.permissions.some((p) => permissions.includes(p));
    if ("permission" in item) return permissions.includes(item.permission);
    return true;
  });

  const dots = dotHrefs(unreadMessageCount, pendingRequestCount);

  return (
    <aside
      className={clsx(
        styles.sidebar,
        !isSidebarOpen && styles.sidebarCollapsed
      )}
    >
      <div className={clsx(styles.logoArea, !isSidebarOpen && styles.logoAreaCollapsed)}>
        <Image
          src="/logo.png"
          alt="Smart PMB Logo"
          width={32}
          height={32}
          className={styles.logoIconImage}
          priority
        />
        {isSidebarOpen && <span>Smart PMB</span>}
      </div>

      <button className={styles.toggleBtn} onClick={toggleSidebar}>
        {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <nav className={styles.nav}>
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                styles.navItem,
                !isSidebarOpen && styles.navItemCollapsed,
                isActive && styles.navItemActive
              )}
              onClick={closeMobileSidebar}
            >
              <span className={styles.navIconWrap}>
                <Icon className={styles.navIcon} size={20} />
                {dots.has(item.href) && <span className={styles.navDot} aria-hidden="true" />}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}

        {permissions.includes("view_profile") && (
          <Link
            href="/profile"
            className={clsx(
              styles.navItem,
              styles.navSpacer,
              !isSidebarOpen && styles.navItemCollapsed,
              pathname === "/profile" && styles.navItemActive
            )}
            onClick={closeMobileSidebar}
          >
            <span className={styles.navIconWrap}>
              <User className={styles.navIcon} size={20} />
            </span>
            <span className={styles.navLabel}>Profile</span>
          </Link>
        )}
      </nav>
    </aside>
  );
}
