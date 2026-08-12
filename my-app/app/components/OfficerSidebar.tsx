/**
 * Collapsible left navigation for the dedicated PMB Officer portal
 * (`app/officer/`) — the officer-only counterpart to Sidebar.tsx (the
 * shared admin/officer sidebar), scoped to just the pages an officer role
 * can reach and pointed at `/officer/*` URLs instead of the admin shell's
 * bare paths. Each item's `permission`/`permissions` gate matches the
 * same codename the underlying page itself checks (via requirePermission/
 * requireAnyPermission on the re-exported (admin) page — see
 * app/officer/*\/page.tsx), so this list is presentation-only: hiding a
 * link here isn't the only thing stopping direct navigation.
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
  Warehouse,
  Coins,
  ClipboardCheck,
  Truck,
  BadgeCheck,
  FileCheck,
  Package,
  BarChart3,
  Receipt,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/officer", icon: LayoutDashboard, permission: "view_dashboard" },
  {
    label: "Users",
    href: "/officer/users",
    icon: Users,
    permissions: [
      "manage_users",
      "manage_farmers",
      "manage_drivers",
      "manage_warehouse_managers",
      "manage_mill_owners",
      "manage_purchasers",
    ],
  },
  { label: "Warehouses", href: "/officer/warehouses", icon: Warehouse, permission: "manage_warehouses" },
  { label: "Pricing", href: "/officer/pricing", icon: Coins, permission: "manage_pricing" },
  {
    label: "Approvals",
    href: "/officer/approvals",
    icon: ClipboardCheck,
    permissions: ["monitor_operations", "record_purchases"],
  },
  { label: "Transportation", href: "/officer/transportation", icon: Truck, permission: "manage_transport" },
  { label: "Licenses", href: "/officer/licenses", icon: BadgeCheck, permission: "approve_licenses" },
  {
    label: "Mill Licenses",
    href: "/officer/mill-licenses",
    icon: FileCheck,
    permissions: ["monitor_operations", "approve_licenses"],
  },
  {
    label: "Rice Requests",
    href: "/officer/purchase-requests",
    icon: Package,
    permissions: ["monitor_operations", "record_purchases"],
  },
  { label: "Reports", href: "/officer/reports", icon: BarChart3, permission: "generate_reports" },
  {
    label: "My Requests",
    href: "/officer/system-requests/mine",
    icon: Receipt,
    permission: "request_system_changes",
  },
  { label: "Messages", href: "/officer/messages", icon: MessageSquare, permission: "view_messages" },
  { label: "Settings", href: "/officer/settings", icon: Settings, permission: "view_settings" },
] as const;

/**
 * Same presence-only red-dot convention as Sidebar.tsx's dotHrefs —
 * Messages (unread), My Requests (payment-pending), and Licenses (pending
 * purchaser/mill-owner self-registrations awaiting review).
 */
function dotHrefs(
  unreadMessageCount: number,
  pendingRequestCount: number,
  pendingLicenseCount: number
): Set<string> {
  const hrefs = new Set<string>();
  if (unreadMessageCount > 0) hrefs.add("/officer/messages");
  if (pendingRequestCount > 0) hrefs.add("/officer/system-requests/mine");
  if (pendingLicenseCount > 0) hrefs.add("/officer/licenses");
  return hrefs;
}

/** Renders the logo, collapse toggle, and the nav links this officer's permissions allow, highlighting the active route. */
export default function OfficerSidebar({
  permissions,
  unreadMessageCount = 0,
  pendingRequestCount = 0,
  pendingLicenseCount = 0,
}: {
  permissions: string[];
  unreadMessageCount?: number;
  pendingRequestCount?: number;
  pendingLicenseCount?: number;
}) {
  const pathname = usePathname();
  const { isSidebarOpen, toggleSidebar, closeMobileSidebar } = useLayout();

  const items = NAV_ITEMS.filter((item) => {
    if ("permissions" in item) return item.permissions.some((p) => permissions.includes(p));
    if ("permission" in item) return permissions.includes(item.permission);
    return true;
  });

  const dots = dotHrefs(unreadMessageCount, pendingRequestCount, pendingLicenseCount);

  return (
    <aside className={clsx(styles.sidebar, !isSidebarOpen && styles.sidebarCollapsed)}>
      <div className={clsx(styles.logoArea, !isSidebarOpen && styles.logoAreaCollapsed)}>
        <Image
          src="/logo.png"
          alt="Smart PMB Logo"
          width={32}
          height={32}
          className={styles.logoIconImage}
          priority
        />
        {isSidebarOpen && <span>PMB Officer</span>}
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
            href="/officer/profile"
            className={clsx(
              styles.navItem,
              styles.navSpacer,
              !isSidebarOpen && styles.navItemCollapsed,
              pathname === "/officer/profile" && styles.navItemActive
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
