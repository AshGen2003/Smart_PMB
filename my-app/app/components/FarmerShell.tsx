/**
 * Top-level shell for every page under `app/farmer/`: farmer sidebar +
 * header, with `children` rendered as the page content. Mounted once by
 * `farmer/layout.tsx`. This is the farmer-portal counterpart to
 * AdminShell — note it has no maintenance banner, and uses
 * IdleRefreshGuard instead of IdleGuard: an idle farmer tab refreshes its
 * data in place rather than ever being logged out or redirected. When an
 * admin is using Portal Preview, `previewing` is set and IdleRefreshGuard
 * is skipped in favor of the persistent PreviewBanner (this is the real
 * admin's own session underneath, not an actual farmer's).
 */
"use client";

import React from "react";
import { LayoutProvider, useLayout } from "./LayoutProvider";
import FarmerSidebar from "./FarmerSidebar";
import Header from "./Header";
import IdleRefreshGuard from "./IdleRefreshGuard";
import PreviewBanner from "./PreviewBanner";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface FarmerShellProps {
  children: React.ReactNode;
  userName: string;
  profilePictureUrl?: string | null;
  previewing?: { slug: string; name: string };
}

/** Reads sidebar open/collapsed state from LayoutProvider and arranges the farmer sidebar, header, and page content. */
function LayoutWrapper({ children, userName, profilePictureUrl, previewing }: FarmerShellProps) {
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
        <FarmerSidebar />
      </div>
      <div className={styles.mainWrapper}>
        {previewing && <PreviewBanner roleName={previewing.name} />}
        <div className={styles.headerArea}>
          <Header
            userName={userName}
            roleLabel="Farmer"
            profileHref="/farmer/profile"
            settingsHref="/farmer/settings"
            profilePictureUrl={profilePictureUrl}
            isFarmer
            previewing={!!previewing}
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
  previewing,
}: FarmerShellProps) {
  return (
    <LayoutProvider>
      <LayoutWrapper userName={userName} profilePictureUrl={profilePictureUrl} previewing={previewing}>
        {children}
      </LayoutWrapper>
    </LayoutProvider>
  );
}
