/**
 * Top-level shell for every page under `app/driver/`: driver sidebar +
 * header, with `children` rendered as the page content. Mounted once by
 * `driver/layout.tsx`. This is the driver-portal counterpart to
 * AdminShell/FarmerShell — uses IdleRefreshGuard like the farmer portal
 * (not IdleGuard's forced logout) since a driver may leave the portal open
 * on their phone for a long shift; an idle tab just refreshes in place.
 */
"use client";

import React from "react";
import { LayoutProvider, useLayout } from "./LayoutProvider";
import DriverSidebar from "./DriverSidebar";
import Header from "./Header";
import IdleRefreshGuard from "./IdleRefreshGuard";
import PreviewBanner from "./PreviewBanner";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface DriverShellProps {
  children: React.ReactNode;
  userName: string;
  permissions: string[];
  profilePictureUrl?: string | null;
  previewing?: { slug: string; name: string };
}

/**
 * Reads sidebar open/collapsed state from LayoutProvider and arranges the
 * driver sidebar, header, and page content. `userName`/`profilePictureUrl`
 * aren't needed here — profile lives in the sidebar as a plain nav link
 * (see DriverSidebar.tsx) rather than a header widget.
 */
function LayoutWrapper({
  children,
  permissions,
  previewing,
}: Omit<DriverShellProps, "userName" | "profilePictureUrl">) {
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
        <DriverSidebar permissions={permissions} />
      </div>
      <div className={styles.mainWrapper}>
        {previewing && <PreviewBanner roleName={previewing.name} />}
        <div className={styles.headerArea}>
          <Header
            messagesHref="/driver/messages"
            restrictedCompose
            previewing={!!previewing}
          />
        </div>
        <main className={styles.mainArea}>{children}</main>
      </div>
    </div>
  );
}

/** Wraps LayoutWrapper in a LayoutProvider so sidebar open/collapsed state is available via context. */
export default function DriverShell({
  children,
  permissions,
  previewing,
}: DriverShellProps) {
  return (
    <LayoutProvider>
      <LayoutWrapper permissions={permissions} previewing={previewing}>
        {children}
      </LayoutWrapper>
    </LayoutProvider>
  );
}
