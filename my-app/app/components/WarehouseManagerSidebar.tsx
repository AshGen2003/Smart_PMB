/**
 * Collapsible left navigation for the warehouse-manager portal — a scaled
 * down copy of DriverSidebar.tsx (same permission-filtered NAV_ITEMS
 * pattern), since a warehouse manager only ever needs their own read-only
 * stock view, messages, and settings; no vehicle-log equivalent exists for
 * this role.
 */
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLayout } from "./LayoutProvider";
import styles from "./Sidebar.module.css";
import clsx from "clsx";
import { History, LayoutDashboard, MessageSquare, QrCode, Settings, ChevronLeft, ChevronRight, User } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/warehouse-manager", icon: LayoutDashboard, permission: "view_dashboard" },
  { label: "Transactions", href: "/warehouse-manager/transactions", icon: History, permission: "view_dashboard" },
  { label: "Delivery Check-In", href: "/warehouse-manager/delivery-slots", icon: QrCode, permission: "view_dashboard" },
  { label: "Messages", href: "/warehouse-manager/messages", icon: MessageSquare, permission: "view_messages" },
  { label: "Settings", href: "/warehouse-manager/settings", icon: Settings, permission: "view_settings" },
];

/** Renders the logo, collapse toggle, and the nav links this warehouse manager's permissions allow, highlighting the active route. */
export default function WarehouseManagerSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const { isSidebarOpen, toggleSidebar, closeMobileSidebar } = useLayout();

  const items = NAV_ITEMS.filter((item) => permissions.includes(item.permission));

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
            href="/warehouse-manager/profile"
            className={clsx(
              styles.navItem,
              styles.navSpacer,
              !isSidebarOpen && styles.navItemCollapsed,
              pathname === "/warehouse-manager/profile" && styles.navItemActive
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
