/**
 * Top-level shell for every page under `app/mill-owner/`: mill owner
 * sidebar + header, with `children` rendered as the page content. Mounted
 * once by `mill-owner/layout.tsx`. Mirrors FarmerShell.tsx.
 */
"use client";

import React from "react";
import { LayoutProvider, useLayout } from "./LayoutProvider";
import MillOwnerSidebar from "./MillOwnerSidebar";
import Header from "./Header";
import IdleRefreshGuard from "./IdleRefreshGuard";
import PreviewBanner from "./PreviewBanner";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface MillOwnerShellProps {
  children: React.ReactNode;
  userName: string;
  profilePictureUrl?: string | null;
  previewing?: { slug: string; name: string };
}

function LayoutWrapper({ children, userName, profilePictureUrl, previewing }: MillOwnerShellProps) {
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
        <MillOwnerSidebar />
      </div>
      <div className={styles.mainWrapper}>
        {previewing && <PreviewBanner roleName={previewing.name} />}
        <div className={styles.headerArea}>
          <Header
            userName={userName}
            roleLabel="Mill Owner"
            profileHref="/mill-owner/profile"
            settingsHref="/mill-owner/settings"
            profilePictureUrl={profilePictureUrl}
            isFarmer
            messagesHref="/mill-owner/messages"
            previewing={!!previewing}
          />
        </div>
        <main className={styles.mainArea}>{children}</main>
      </div>
    </div>
  );
}

/** Wraps LayoutWrapper in a LayoutProvider so sidebar open/collapsed state is available via context. */
export default function MillOwnerShell({
  children,
  userName,
  profilePictureUrl,
  previewing,
}: MillOwnerShellProps) {
  return (
    <LayoutProvider>
      <LayoutWrapper userName={userName} profilePictureUrl={profilePictureUrl} previewing={previewing}>
        {children}
      </LayoutWrapper>
    </LayoutProvider>
  );
}
