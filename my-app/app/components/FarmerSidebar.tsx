"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLayout } from "./LayoutProvider";
import styles from "./Sidebar.module.css";
import clsx from "clsx";
import { LayoutDashboard, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { logout } from "@/app/actions/auth";

const NAV_ITEMS = [{ label: "Dashboard", href: "/farmer", icon: LayoutDashboard }];

export default function FarmerSidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, toggleSidebar, closeMobileSidebar } = useLayout();

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
        {NAV_ITEMS.map((item) => {
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

        <form
          action={logout}
          className={clsx(styles.navSpacer, !isSidebarOpen && styles.navItemCollapsed)}
        >
          <button
            type="submit"
            className={clsx(
              styles.navItem,
              styles.navButton,
              !isSidebarOpen && styles.navItemCollapsed
            )}
          >
            <LogOut className={styles.navIcon} size={20} />
            <span className={styles.navLabel}>Log out</span>
          </button>
        </form>
      </nav>
    </aside>
  );
}
