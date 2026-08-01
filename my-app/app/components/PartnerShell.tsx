/**
 * Top-level shell for every page under `app/partner/`: partner sidebar +
 * header, with `children` rendered as the page content. Mounted once by
 * `partner/layout.tsx` — reached once a LicenseApplication has been
 * approved, or there's no application at all (admin-created account, or an
 * admin using Portal Preview — see partner/layout.tsx). When previewing,
 * IdleRefreshGuard is skipped in favor of the persistent PreviewBanner
 * (this is the real admin's own session underneath, not an actual
 * purchaser/mill-owner's), matching FarmerShell/DriverShell.
 */
"use client";

import React from "react";
import { LayoutProvider, useLayout } from "./LayoutProvider";
import PartnerSidebar from "./PartnerSidebar";
import Header from "./Header";
import IdleRefreshGuard from "./IdleRefreshGuard";
import PreviewBanner from "./PreviewBanner";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface PartnerShellProps {
  children: React.ReactNode;
  userName: string;
  role: "authorized_purchaser" | "mill_owner";
  permissions: string[];
  profilePictureUrl?: string | null;
  notifyMessages?: boolean;
  previewing?: { slug: string; name: string };
}

/**
 * Reads sidebar open/collapsed state from LayoutProvider and arranges the
 * partner sidebar, header, and page content. `userName`/`profilePictureUrl`
 * aren't needed here — profile lives in the sidebar as a plain nav link
 * (see PartnerSidebar.tsx) rather than a header widget.
 */
function LayoutWrapper({
  children,
  role,
  permissions,
  notifyMessages,
  previewing,
}: Omit<PartnerShellProps, "userName" | "profilePictureUrl">) {
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
        <PartnerSidebar role={role} permissions={permissions} />
      </div>
      <div className={styles.mainWrapper}>
        {previewing && <PreviewBanner roleName={previewing.name} />}
        <div className={styles.headerArea}>
          <Header
            messagesHref="/partner/messages"
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
export default function PartnerShell({
  children,
  role,
  permissions,
  notifyMessages,
  previewing,
}: PartnerShellProps) {
  return (
    <LayoutProvider>
      <LayoutWrapper role={role} permissions={permissions} notifyMessages={notifyMessages} previewing={previewing}>
        {children}
      </LayoutWrapper>
    </LayoutProvider>
  );
}
