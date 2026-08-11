/**
 * Top-level shell for every page under `app/officer/`: officer sidebar +
 * header + idle-logout watcher + optional maintenance-mode banner, with
 * `children` rendered as the page content. Mounted once by
 * `officer/layout.tsx` — a direct copy of AdminShell.tsx's structure,
 * swapping in OfficerSidebar (see that component for the officer-scoped
 * nav list and `/officer/*` URLs).
 *
 * Portal Preview can land here too: previewing "PMB Officer" from /preview
 * redirects into this real portal the same way previewing "Farmer"
 * navigates into the real farmer portal (see FarmerShell.tsx and
 * (admin)/layout.tsx's redirect) — this is the real admin's own session
 * underneath, not an actual officer's, so `previewing` skips the idle
 * watchdog in favor of the persistent PreviewBanner, same as every other
 * shell that can be reached this way.
 */
"use client";

import React from "react";
import { LayoutProvider, useLayout } from "./LayoutProvider";
import OfficerSidebar from "./OfficerSidebar";
import Header from "./Header";
import IdleGuard from "./IdleGuard";
import PreviewBanner from "./PreviewBanner";
import ImpersonationBanner from "./ImpersonationBanner";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface OfficerShellProps {
  children: React.ReactNode;
  permissions: string[];
  notifyMessages?: boolean;
  idleMinutes?: number;
  maintenanceMode?: boolean;
  unreadMessageCount?: number;
  pendingRequestCount?: number;
  pendingLicenseCount?: number;
  previewing?: { slug: string; name: string };
  impersonating?: { email: string };
}

function LayoutWrapper({
  children,
  permissions,
  notifyMessages,
  idleMinutes,
  maintenanceMode,
  unreadMessageCount,
  pendingRequestCount,
  pendingLicenseCount,
  previewing,
  impersonating,
}: OfficerShellProps) {
  const { isMobileSidebarOpen, isSidebarOpen, closeMobileSidebar } = useLayout();

  return (
    <div className={styles.layout}>
      {!previewing && <IdleGuard idleMinutes={idleMinutes} />}
      <div
        className={clsx(
          styles.sidebarArea,
          !isSidebarOpen && styles.sidebarAreaCollapsed,
          isMobileSidebarOpen && styles.mobileOpen
        )}
      >
        <OfficerSidebar
          permissions={permissions}
          unreadMessageCount={unreadMessageCount}
          pendingRequestCount={pendingRequestCount}
          pendingLicenseCount={pendingLicenseCount}
        />
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
            messagesHref="/officer/messages"
            previewing={!!previewing}
            notifyMessages={notifyMessages}
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

/** Wraps LayoutWrapper in a LayoutProvider so sidebar open/collapsed state is available via context. */
export default function OfficerShell({
  children,
  permissions,
  notifyMessages,
  idleMinutes,
  maintenanceMode,
  unreadMessageCount,
  pendingRequestCount,
  pendingLicenseCount,
  previewing,
  impersonating,
}: OfficerShellProps) {
  return (
    <LayoutProvider>
      <LayoutWrapper
        permissions={permissions}
        notifyMessages={notifyMessages}
        idleMinutes={idleMinutes}
        maintenanceMode={maintenanceMode}
        unreadMessageCount={unreadMessageCount}
        pendingRequestCount={pendingRequestCount}
        pendingLicenseCount={pendingLicenseCount}
        previewing={previewing}
        impersonating={impersonating}
      >
        {children}
      </LayoutWrapper>
    </LayoutProvider>
  );
}
