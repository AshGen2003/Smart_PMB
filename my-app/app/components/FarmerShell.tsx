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
import ImpersonationBanner from "./ImpersonationBanner";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface FarmerShellProps {
  children: React.ReactNode;
  userName: string;
  permissions: string[];
  profilePictureUrl?: string | null;
  notifyMessages?: boolean;
  previewing?: { slug: string; name: string };
  impersonating?: { email: string };
}

/**
 * Reads sidebar open/collapsed state from LayoutProvider and arranges the
 * farmer sidebar, header, and page content. `userName`/`profilePictureUrl`
 * aren't needed here — profile lives in the sidebar as a plain nav link
 * (see FarmerSidebar.tsx) rather than a header widget.
 */
function LayoutWrapper({
  children,
  permissions,
  notifyMessages,
  previewing,
  impersonating,
}: Omit<FarmerShellProps, "userName" | "profilePictureUrl">) {
  const { isMobileSidebarOpen, isSidebarOpen, closeMobileSidebar } = useLayout();

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
        <FarmerSidebar permissions={permissions} />
      </div>
      <div
        className={clsx(styles.mobileBackdrop, isMobileSidebarOpen && styles.mobileBackdropVisible)}
        onClick={closeMobileSidebar}
        aria-hidden="true"
      />
      <div className={styles.mainWrapper}>
        {previewing && <PreviewBanner roleName={previewing.name} />}
        {impersonating && <ImpersonationBanner adminEmail={impersonating.email} />}
        <div className={styles.headerArea}>
          <Header
            messagesHref="/farmer/messages"
            restrictedCompose
            previewing={!!previewing}
            notifyMessages={notifyMessages}
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
  permissions,
  notifyMessages,
  previewing,
  impersonating,
}: FarmerShellProps) {
  return (
    <LayoutProvider>
      <LayoutWrapper
        permissions={permissions}
        notifyMessages={notifyMessages}
        previewing={previewing}
        impersonating={impersonating}
      >
        {children}
      </LayoutWrapper>
    </LayoutProvider>
  );
}
