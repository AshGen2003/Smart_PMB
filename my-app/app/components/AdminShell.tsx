/**
 * Top-level shell for every page in the `(admin)` route group: sidebar +
 * header + idle-logout watcher + optional maintenance-mode banner, with
 * `children` rendered as the page content. Mounted once by
 * `(admin)/layout.tsx` and reused for every admin/officer page.
 */
"use client";

import React from "react";
import Link from "next/link";
import { LayoutProvider, useLayout } from "./LayoutProvider";
import Sidebar from "./Sidebar";
import Header from "./Header";
import IdleGuard from "./IdleGuard";
import PreviewBanner from "./PreviewBanner";
import ImpersonationBanner from "./ImpersonationBanner";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface AdminShellProps {
  children: React.ReactNode;
  userName: string;
  roleLabel: string;
  permissions: string[];
  profilePictureUrl?: string | null;
  notifyMessages?: boolean;
  idleMinutes?: number;
  maintenanceMode?: boolean;
  previewing?: { slug: string; name: string };
  impersonating?: { email: string };
  // Red-dot counts for the sidebar's Messages/System Requests/Licenses nav
  // items — see (admin)/layout.tsx for how these are computed.
  unreadMessageCount?: number;
  pendingRequestCount?: number;
  pendingLicenseCount?: number;
}

/**
 * Reads sidebar open/collapsed state from LayoutProvider's context and
 * arranges the sidebar, header, maintenance banner, and page content.
 * Split out from AdminShell so it can call `useLayout()`, which requires
 * being inside the LayoutProvider that AdminShell renders.
 */
function LayoutWrapper({
  children,
  permissions,
  notifyMessages,
  idleMinutes,
  maintenanceMode,
  previewing,
  impersonating,
  unreadMessageCount,
  pendingRequestCount,
  pendingLicenseCount,
}: Omit<AdminShellProps, "userName" | "roleLabel" | "profilePictureUrl">) {
  const { isMobileSidebarOpen, isSidebarOpen } = useLayout();

  return (
    <div className={styles.layout}>
      {/* Skip the idle-logout watchdog while previewing — it's the real
          admin's own long-lived session underneath, not a separate login. */}
      {!previewing && <IdleGuard idleMinutes={idleMinutes} />}
      <div
        className={clsx(
          styles.sidebarArea,
          !isSidebarOpen && styles.sidebarAreaCollapsed,
          isMobileSidebarOpen && styles.mobileOpen
        )}
      >
        <Sidebar
          permissions={permissions}
          unreadMessageCount={unreadMessageCount}
          pendingRequestCount={pendingRequestCount}
          pendingLicenseCount={pendingLicenseCount}
        />
      </div>
      <div className={styles.mainWrapper}>
        {previewing && <PreviewBanner roleName={previewing.name} />}
        {impersonating && <ImpersonationBanner adminEmail={impersonating.email} />}
        <div className={styles.headerArea}>
          <Header previewing={!!previewing} notifyMessages={notifyMessages} />
        </div>
        {maintenanceMode && (
          <div className={styles.maintenanceBanner}>
            Maintenance mode is ON — everyone except admins is locked out right now.{" "}
            <Link href="/maintenance">Turn off</Link>
          </div>
        )}
        <main className={styles.mainArea}>{children}</main>
      </div>
    </div>
  );
}

/**
 * Wraps LayoutWrapper in a LayoutProvider so sidebar open/collapsed state
 * is available via context. `permissions` is forwarded to the Sidebar to
 * decide which nav links to show; `idleMinutes` configures the auto-logout
 * timer; `maintenanceMode` toggles the system-wide banner. `userName`/
 * `roleLabel`/`profilePictureUrl` are accepted (callers already pass them)
 * but no longer forwarded anywhere — profile lives in the sidebar as a
 * plain nav link (see Sidebar.tsx) rather than a header widget.
 */
export default function AdminShell({
  children,
  permissions,
  notifyMessages,
  idleMinutes,
  maintenanceMode,
  previewing,
  impersonating,
  unreadMessageCount,
  pendingRequestCount,
  pendingLicenseCount,
}: AdminShellProps) {
  return (
    <LayoutProvider>
      <LayoutWrapper
        permissions={permissions}
        notifyMessages={notifyMessages}
        idleMinutes={idleMinutes}
        maintenanceMode={maintenanceMode}
        previewing={previewing}
        impersonating={impersonating}
        unreadMessageCount={unreadMessageCount}
        pendingRequestCount={pendingRequestCount}
        pendingLicenseCount={pendingLicenseCount}
      >
        {children}
      </LayoutWrapper>
    </LayoutProvider>
  );
}
