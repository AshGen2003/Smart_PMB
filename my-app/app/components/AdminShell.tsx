/**
 * Top-level shell for every page in the `(admin)` route group: sidebar +
 * header + idle-logout watcher + optional maintenance-mode banner, with
 * `children` rendered as the page content. Mounted once by
 * `(admin)/layout.tsx` and reused for every admin/officer page.
 */
"use client";

import React from "react";
import { LayoutProvider, useLayout } from "./LayoutProvider";
import Sidebar from "./Sidebar";
import Header from "./Header";
import IdleGuard from "./IdleGuard";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface AdminShellProps {
  children: React.ReactNode;
  userName: string;
  roleLabel: string;
  permissions: string[];
  profilePictureUrl?: string | null;
  idleMinutes?: number;
  maintenanceMode?: boolean;
}

/**
 * Reads sidebar open/collapsed state from LayoutProvider's context and
 * arranges the sidebar, header, maintenance banner, and page content.
 * Split out from AdminShell so it can call `useLayout()`, which requires
 * being inside the LayoutProvider that AdminShell renders.
 */
function LayoutWrapper({
  children,
  userName,
  roleLabel,
  permissions,
  profilePictureUrl,
  idleMinutes,
  maintenanceMode,
}: AdminShellProps) {
  const { isMobileSidebarOpen, isSidebarOpen } = useLayout();

  return (
    <div className={styles.layout}>
      <IdleGuard idleMinutes={idleMinutes} />
      <div
        className={clsx(
          styles.sidebarArea,
          !isSidebarOpen && styles.sidebarAreaCollapsed,
          isMobileSidebarOpen && styles.mobileOpen
        )}
      >
        <Sidebar permissions={permissions} />
      </div>
      <div className={styles.mainWrapper}>
        <div className={styles.headerArea}>
          <Header
            userName={userName}
            roleLabel={roleLabel}
            profilePictureUrl={profilePictureUrl}
          />
        </div>
        {maintenanceMode && (
          <div className={styles.maintenanceBanner}>
            System maintenance mode is active — some changes may be delayed or reverted.
          </div>
        )}
        <main className={styles.mainArea}>{children}</main>
      </div>
    </div>
  );
}

/**
 * Wraps LayoutWrapper in a LayoutProvider so sidebar open/collapsed state
 * is available via context. `permissions` is forwarded to the Sidebar to
 * decide which nav links to show; `idleMinutes` configures the auto-logout
 * timer; `maintenanceMode` toggles the system-wide banner.
 */
export default function AdminShell({
  children,
  userName,
  roleLabel,
  permissions,
  profilePictureUrl,
  idleMinutes,
  maintenanceMode,
}: AdminShellProps) {
  return (
    <LayoutProvider>
      <LayoutWrapper
        userName={userName}
        roleLabel={roleLabel}
        permissions={permissions}
        profilePictureUrl={profilePictureUrl}
        idleMinutes={idleMinutes}
        maintenanceMode={maintenanceMode}
      >
        {children}
      </LayoutWrapper>
    </LayoutProvider>
  );
}
