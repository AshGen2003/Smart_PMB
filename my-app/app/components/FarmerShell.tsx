/**
 * Top-level shell for every page under `app/farmer/`: farmer sidebar +
 * header, with `children` rendered as the page content. Mounted once by
 * `farmer/layout.tsx`. This is the farmer-portal counterpart to
 * AdminShell — note it has no IdleGuard or maintenance banner.
 */
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
  profilePictureUrl?: string | null;
}

/** Reads sidebar open/collapsed state from LayoutProvider and arranges the farmer sidebar, header, and page content. */
function LayoutWrapper({ children, userName, profilePictureUrl }: FarmerShellProps) {
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
          <Header
            userName={userName}
            roleLabel="Farmer"
            profileHref="/farmer/profile"
            settingsHref="/farmer/settings"
            profilePictureUrl={profilePictureUrl}
          />
        </div>
        <main className={styles.mainArea}>{children}</main>
      </div>
    </div>
  );
}

/** Wraps LayoutWrapper in a LayoutProvider so sidebar open/collapsed state is available via context. */
export default function FarmerShell({
  children,
  userName,
  profilePictureUrl,
}: FarmerShellProps) {
  return (
    <LayoutProvider>
      <LayoutWrapper userName={userName} profilePictureUrl={profilePictureUrl}>
        {children}
      </LayoutWrapper>
    </LayoutProvider>
  );
}
