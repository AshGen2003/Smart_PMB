/**
 * Collapsible left navigation for the admin/officer shell. Each nav item
 * can declare a required `permission` (single codename) or `permissions`
 * (any-of list); items with neither are shown to everyone. This is purely
 * a UI convenience — the actual access control happens server-side via
 * requirePermission()/requireAnyPermission() on each page, so hiding a
 * link here doesn't by itself protect the route.
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
  Eye,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Full set of possible sidebar links. `permission` gates a link behind a
// single codename; `permissions` gates it behind any one of several
// codenames (e.g. Approvals is visible to either monitor_operations or
// record_purchases holders). No permission field = visible to all admin/
// officer roles (e.g. Dashboard, Settings).
const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
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
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "generate_reports" },
  { label: "Roles", href: "/roles", icon: ShieldCheck, permission: "manage_roles" },
  { label: "Preview Portal", href: "/preview", icon: Eye, permission: "manage_roles" },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

/** Renders the logo, collapse toggle, and the nav links visible to the current user's permission set, highlighting the active route. */
export default function Sidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const { isSidebarOpen, toggleSidebar, closeMobileSidebar } = useLayout();

  // Filter the full nav list down to what this user's permissions allow.
  const items = NAV_ITEMS.filter((item) => {
    if ("permissions" in item) return item.permissions.some((p) => permissions.includes(p));
    if ("permission" in item) return permissions.includes(item.permission);
    return true;
  });

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
              <Icon className={styles.navIcon} size={20} />
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
