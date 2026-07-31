/**
 * Top-level shell for every page under `app/transport-operator/`: transport
 * operator sidebar + header, with `children` rendered as the page content.
 * Mounted once by `transport-operator/layout.tsx`. Mirrors MillOwnerShell.tsx.
 */
"use client";

import React from "react";
import { LayoutProvider, useLayout } from "./LayoutProvider";
import TransportOperatorSidebar from "./TransportOperatorSidebar";
import Header from "./Header";
import IdleRefreshGuard from "./IdleRefreshGuard";
import PreviewBanner from "./PreviewBanner";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface TransportOperatorShellProps {
  children: React.ReactNode;
  userName: string;
  profilePictureUrl?: string | null;
  previewing?: { slug: string; name: string };
}

function LayoutWrapper({ children, userName, profilePictureUrl, previewing }: TransportOperatorShellProps) {
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
        <TransportOperatorSidebar />
      </div>
      <div className={styles.mainWrapper}>
        {previewing && <PreviewBanner roleName={previewing.name} />}
        <div className={styles.headerArea}>
          <Header
            userName={userName}
            roleLabel="Transport Operator"
            profileHref="/transport-operator/profile"
            settingsHref="/transport-operator/settings"
            profilePictureUrl={profilePictureUrl}
            restrictedCompose={false}
            messagesHref="/transport-operator/messages"
            previewing={!!previewing}
          />
        </div>
        <main className={styles.mainArea}>{children}</main>
      </div>
    </div>
  );
}

/** Wraps LayoutWrapper in a LayoutProvider so sidebar open/collapsed state is available via context. */
export default function TransportOperatorShell({
  children,
  userName,
  profilePictureUrl,
  previewing,
}: TransportOperatorShellProps) {
  return (
    <LayoutProvider>
      <LayoutWrapper userName={userName} profilePictureUrl={profilePictureUrl} previewing={previewing}>
        {children}
      </LayoutWrapper>
    </LayoutProvider>
  );
}
