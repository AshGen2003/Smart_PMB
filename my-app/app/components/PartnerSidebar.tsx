/**
 * Collapsible left navigation for the partner portal (authorized
 * purchasers and mill owners). Structurally identical to FarmerSidebar/
 * DriverSidebar — filtered by `permissions`, every item has a view_*
 * permission gating it, granted to every role by default (see accounts/
 * migrations/0015). Log out lives in the shared Header, not here.
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
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  FileCheck,
  ClipboardList,
  Package,
} from "lucide-react";

const BASE_NAV_ITEMS = [
  { label: "Dashboard", href: "/partner", icon: LayoutDashboard, permission: "view_dashboard" },
];

// Mill owners get their own ongoing License history (renewable, expiry-
// tracked — see mills/models.py's License) and periodic milling reports.
// Authorized purchasers instead get their rice requests against warehouse
// stock (see purchases/models.py's RiceRequest). Both sets are gated by the
// same view_dashboard permission as the rest of the shell — there's no
// separate permission per business feature, same as Messages/Settings.
const MILL_OWNER_NAV_ITEMS = [
  { label: "Licenses", href: "/partner/licenses", icon: FileCheck, permission: "view_dashboard" },
  { label: "Milling Reports", href: "/partner/milling-reports", icon: ClipboardList, permission: "view_dashboard" },
];

const PURCHASER_NAV_ITEMS = [
  { label: "Rice Requests", href: "/partner/rice-requests", icon: Package, permission: "view_dashboard" },
];

const TAIL_NAV_ITEMS = [
  { label: "Messages", href: "/partner/messages", icon: MessageSquare, permission: "view_messages" },
  { label: "Settings", href: "/partner/settings", icon: Settings, permission: "view_settings" },
];

/** Renders the logo, collapse toggle, and the nav links this partner's role/permissions allow, highlighting the active route. */
export default function PartnerSidebar({
  role,
  permissions,
}: {
  role: "authorized_purchaser" | "mill_owner";
  permissions: string[];
}) {
  const pathname = usePathname();
  const { isSidebarOpen, toggleSidebar, closeMobileSidebar } = useLayout();

  const roleItems = role === "mill_owner" ? MILL_OWNER_NAV_ITEMS : PURCHASER_NAV_ITEMS;
  const items = [...BASE_NAV_ITEMS, ...roleItems, ...TAIL_NAV_ITEMS].filter((item) =>
    permissions.includes(item.permission)
  );

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
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}

        {permissions.includes("view_profile") && (
          <Link
            href="/partner/profile"
            className={clsx(
              styles.navItem,
              styles.navSpacer,
              !isSidebarOpen && styles.navItemCollapsed,
              pathname === "/partner/profile" && styles.navItemActive
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
