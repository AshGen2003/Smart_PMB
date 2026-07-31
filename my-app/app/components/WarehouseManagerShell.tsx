/**
 * Top-level shell for every page under `app/warehouse-manager/`: warehouse
 * manager sidebar + header, with `children` rendered as the page content.
 * Mounted once by `warehouse-manager/layout.tsx`. Mirrors MillOwnerShell.tsx.
 */
"use client";

import React from "react";
import { LayoutProvider, useLayout } from "./LayoutProvider";
import WarehouseManagerSidebar from "./WarehouseManagerSidebar";
import Header from "./Header";
import IdleRefreshGuard from "./IdleRefreshGuard";
import PreviewBanner from "./PreviewBanner";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface WarehouseManagerShellProps {
  children: React.ReactNode;
  userName: string;
  profilePictureUrl?: string | null;
  previewing?: { slug: string; name: string };
}

function LayoutWrapper({ children, userName, profilePictureUrl, previewing }: WarehouseManagerShellProps) {
  const { isMobileSidebarOpen, isSidebarOpen } = useLayout();

  return (
    <div className={styles.layout}>
      {!previewing && <IdleRefreshGuard />}
      <div
        className={clsx(
          styles.sidebarArea,
          !isSidebarOpen && styles.sidebarAreaCollapsed,
          isMobileSidebarOpen && styles.mobileOpen
        )}
      >
        <WarehouseManagerSidebar />
      </div>
      <div className={styles.mainWrapper}>
        {previewing && <PreviewBanner roleName={previewing.name} />}
        <div className={styles.headerArea}>
          <Header
            userName={userName}
            roleLabel="Warehouse Manager"
            profileHref="/warehouse-manager/profile"
            settingsHref="/warehouse-manager/settings"
            profilePictureUrl={profilePictureUrl}
            restrictedCompose={false}
            messagesHref="/warehouse-manager/messages"
            previewing={!!previewing}
          />
        </div>
        <main className={styles.mainArea}>{children}</main>
      </div>
    </div>
  );
}

/** Wraps LayoutWrapper in a LayoutProvider so sidebar open/collapsed state is available via context. */
export default function WarehouseManagerShell({
  children,
  userName,
  profilePictureUrl,
  previewing,
}: WarehouseManagerShellProps) {
  return (
    <LayoutProvider>
      <LayoutWrapper userName={userName} profilePictureUrl={profilePictureUrl} previewing={previewing}>
        {children}
      </LayoutWrapper>
    </LayoutProvider>
  );
}
