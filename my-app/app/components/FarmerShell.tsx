"use client";

import React from "react";
import { LayoutProvider, useLayout } from "./LayoutProvider";
import FarmerSidebar from "./FarmerSidebar";
import Header from "./Header";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface FarmerShellProps {
  children: React.ReactNode;
  userName: string;
}

function LayoutWrapper({ children, userName }: FarmerShellProps) {
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
        <FarmerSidebar />
      </div>
      <div className={styles.mainWrapper}>
        <div className={styles.headerArea}>
          <Header userName={userName} roleLabel="Farmer" />
        </div>
        <main className={styles.mainArea}>{children}</main>
      </div>
    </div>
  );
}

export default function FarmerShell({ children, userName }: FarmerShellProps) {
  return (
    <LayoutProvider>
      <LayoutWrapper userName={userName}>{children}</LayoutWrapper>
    </LayoutProvider>
  );
}
