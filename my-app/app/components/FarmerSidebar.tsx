/**
 * Collapsible left navigation for the farmer portal. Filtered by
 * `permissions` the same way the admin Sidebar is — every item (and the
 * bottom-pinned Profile link) has a view_* permission gating it, granted to
 * every role by default (see accounts/migrations/0015), toggleable per
 * role from /roles or the Preview Portal's quick-toggle checklist. Log out
 * lives in the shared Header (top-right) instead of here — see Header.tsx.
 */
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLayout } from "./LayoutProvider";
import { useLanguage } from "./LanguageProvider";
import styles from "./Sidebar.module.css";
import clsx from "clsx";
import {
  LayoutDashboard,
  Sprout,
  CalendarClock,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";

/** Renders the logo, collapse toggle, and the nav links this farmer's permissions allow, highlighting the active route. */
export default function FarmerSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const { isSidebarOpen, toggleSidebar, closeMobileSidebar } = useLayout();
  const { t } = useLanguage();

  const NAV_ITEMS = [
    { label: t.farmerSidebar.dashboard, href: "/farmer", icon: LayoutDashboard, permission: "view_dashboard" },
    { label: t.farmerSidebar.harvests, href: "/farmer/harvests", icon: Sprout, permission: "view_dashboard" },
    { label: t.farmerSidebar.deliverySlots, href: "/farmer/delivery-slots", icon: CalendarClock, permission: "view_dashboard" },
    { label: t.farmerSidebar.messages, href: "/farmer/messages", icon: MessageSquare, permission: "view_messages" },
    { label: t.farmerSidebar.settings, href: "/farmer/settings", icon: Settings, permission: "view_settings" },
  ];

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
            href="/farmer/profile"
            className={clsx(
              styles.navItem,
              styles.navSpacer,
              !isSidebarOpen && styles.navItemCollapsed,
              pathname === "/farmer/profile" && styles.navItemActive
            )}
            onClick={closeMobileSidebar}
          >
            <span className={styles.navIconWrap}>
              <User className={styles.navIcon} size={20} />
            </span>
            <span className={styles.navLabel}>{t.farmerSidebar.profile}</span>
          </Link>
        )}
      </nav>
    </aside>
  );
}
