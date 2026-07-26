/**
 * Collapsible left navigation for the driver portal. Filtered by
 * `permissions` the same way the admin Sidebar is — every item (and the
 * bottom-pinned Profile link) has a view_* permission gating it; Dashboard/
 * Messages/Settings/Profile are granted to every role by default (see
 * accounts/migrations/0015), while Vehicle Details/Vehicle Log are
 * driver-specific and only granted to "driver" by default (see
 * accounts/migrations/0017) — all toggleable per role from /roles or the
 * Preview Portal's quick-toggle checklist. Log out lives in the shared
 * Header (top-right) instead of here — see Header.tsx.
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
  Truck,
  Info,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/driver", icon: LayoutDashboard, permission: "view_dashboard" },
  { label: "Vehicle Details", href: "/driver/vehicle-details", icon: Info, permission: "view_vehicle_details" },
  { label: "Vehicle Log", href: "/driver/vehicle", icon: Truck, permission: "view_vehicle_log" },
  { label: "Messages", href: "/driver/messages", icon: MessageSquare, permission: "view_messages" },
  { label: "Settings", href: "/driver/settings", icon: Settings, permission: "view_settings" },
];

/** Renders the logo, collapse toggle, and the nav links this driver's permissions allow, highlighting the active route. */
export default function DriverSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const { isSidebarOpen, toggleSidebar, closeMobileSidebar } = useLayout();

  const items = NAV_ITEMS.filter((item) => permissions.includes(item.permission));

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

        {permissions.includes("view_profile") && (
          <Link
            href="/driver/profile"
            className={clsx(
              styles.navItem,
              styles.navSpacer,
              !isSidebarOpen && styles.navItemCollapsed,
              pathname === "/driver/profile" && styles.navItemActive
            )}
            onClick={closeMobileSidebar}
          >
            <User className={styles.navIcon} size={20} />
            <span className={styles.navLabel}>Profile</span>
          </Link>
        )}
      </nav>
    </aside>
  );
}
