/**
 * Collapsible left navigation for the mill owner portal. Structurally
 * identical to FarmerSidebar/DriverSidebar — filtered by `permissions`,
 * every item has a view_* permission gating it, granted to every role by
 * default (see accounts/migrations/0015). Log out lives in the shared
 * Header, not here.
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
} from "lucide-react";

// A mill owner's ongoing License history (renewable, expiry-tracked — see
// mills/models.py's License) and periodic milling reports. Gated by the
// same view_dashboard permission as the rest of the shell — there's no
// separate permission per business feature, same as Messages/Settings.
const NAV_ITEMS = [
  { label: "Dashboard", href: "/mill-owner", icon: LayoutDashboard, permission: "view_dashboard" },
  { label: "Licenses", href: "/mill-owner/licenses", icon: FileCheck, permission: "view_dashboard" },
  { label: "Milling Reports", href: "/mill-owner/milling-reports", icon: ClipboardList, permission: "view_dashboard" },
  { label: "Messages", href: "/mill-owner/messages", icon: MessageSquare, permission: "view_messages" },
  { label: "Settings", href: "/mill-owner/settings", icon: Settings, permission: "view_settings" },
];

/** Renders the logo, collapse toggle, and the nav links this mill owner's permissions allow, highlighting the active route. */
export default function MillOwnerSidebar({ permissions }: { permissions: string[] }) {
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
              <span className={styles.navIconWrap}>
                <Icon className={styles.navIcon} size={20} />
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}

        {permissions.includes("view_profile") && (
          <Link
            href="/mill-owner/profile"
            className={clsx(
              styles.navItem,
              styles.navSpacer,
              !isSidebarOpen && styles.navItemCollapsed,
              pathname === "/mill-owner/profile" && styles.navItemActive
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
