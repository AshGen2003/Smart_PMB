/**
 * Top-level shell for every page under `app/mill-owner/`: mill owner
 * sidebar + header, with `children` rendered as the page content. Mounted
 * once by `mill-owner/layout.tsx` — reached once a LicenseApplication has
 * been approved, or there's no application at all (admin-created account,
 * or an admin using Portal Preview — see mill-owner/layout.tsx). When
 * previewing, IdleRefreshGuard is skipped in favor of the persistent
 * PreviewBanner (this is the real admin's own session underneath, not an
 * actual mill owner's), matching FarmerShell/DriverShell.
 */
"use client";

import React from "react";
import { LayoutProvider, useLayout } from "./LayoutProvider";
import MillOwnerSidebar from "./MillOwnerSidebar";
import Header from "./Header";
import IdleRefreshGuard from "./IdleRefreshGuard";
import PreviewBanner from "./PreviewBanner";
import ImpersonationBanner from "./ImpersonationBanner";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface MillOwnerShellProps {
  children: React.ReactNode;
  permissions: string[];
  notifyMessages?: boolean;
  previewing?: { slug: string; name: string };
  impersonating?: { email: string };
}

/**
 * Reads sidebar open/collapsed state from LayoutProvider and arranges the
 * mill owner sidebar, header, and page content. `userName`/
 * `profilePictureUrl` aren't needed here — profile lives in the sidebar as
 * a plain nav link (see MillOwnerSidebar.tsx) rather than a header widget.
 */
function LayoutWrapper({
  children,
  permissions,
  notifyMessages,
  previewing,
  impersonating,
}: MillOwnerShellProps) {
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
        <MillOwnerSidebar permissions={permissions} />
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
            messagesHref="/mill-owner/messages"
            restrictedCompose
            notifyMessages={notifyMessages}
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
  permissions,
  notifyMessages,
  previewing,
  impersonating,
}: MillOwnerShellProps) {
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
