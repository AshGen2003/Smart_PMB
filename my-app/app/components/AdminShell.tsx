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
