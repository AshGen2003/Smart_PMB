"use client";

import React from "react";
import { LayoutProvider, useLayout } from "./LayoutProvider";
import Sidebar from "./Sidebar";
import Header from "./Header";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface AdminShellProps {
  children: React.ReactNode;
  userName: string;
  roleLabel: string;
  permissions: string[];
}

function LayoutWrapper({ children, userName, roleLabel, permissions }: AdminShellProps) {
  const { isMobileSidebarOpen, isSidebarOpen } = useLayout();

  return (
    <div className={styles.layout}>
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
          <Header userName={userName} roleLabel={roleLabel} />
        </div>
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
}: AdminShellProps) {
  return (
    <LayoutProvider>
      <LayoutWrapper userName={userName} roleLabel={roleLabel} permissions={permissions}>
        {children}
      </LayoutWrapper>
    </LayoutProvider>
  );
}
