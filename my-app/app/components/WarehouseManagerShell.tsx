/**
 * Top-level shell for every page under `app/warehouse-manager/`: warehouse-
 * manager sidebar + header, with `children` rendered as the page content.
 * Mounted once by `warehouse-manager/layout.tsx` — a direct copy of
 * DriverShell.tsx's structure, swapping in WarehouseManagerSidebar.
 */
"use client";

import React from "react";
import { LayoutProvider, useLayout } from "./LayoutProvider";
import WarehouseManagerSidebar from "./WarehouseManagerSidebar";
import Header from "./Header";
import IdleRefreshGuard from "./IdleRefreshGuard";
import PreviewBanner from "./PreviewBanner";
import ImpersonationBanner from "./ImpersonationBanner";
import styles from "./DashboardShell.module.css";
import clsx from "clsx";

interface WarehouseManagerShellProps {
  children: React.ReactNode;
  permissions: string[];
  notifyMessages?: boolean;
  previewing?: { slug: string; name: string };
  impersonating?: { email: string };
}

function LayoutWrapper({
  children,
  permissions,
  notifyMessages,
  previewing,
  impersonating,
}: WarehouseManagerShellProps) {
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
        <WarehouseManagerSidebar permissions={permissions} />
      </div>
      <div className={styles.mainWrapper}>
        {previewing && <PreviewBanner roleName={previewing.name} />}
        {impersonating && <ImpersonationBanner adminEmail={impersonating.email} />}
        <div className={styles.headerArea}>
          <Header
            messagesHref="/warehouse-manager/messages"
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
export default function WarehouseManagerShell({
  children,
  permissions,
  notifyMessages,
  previewing,
  impersonating,
}: WarehouseManagerShellProps) {
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
