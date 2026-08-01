/**
 * Top header bar shared by AdminShell, FarmerShell, and DriverShell: mobile
 * sidebar toggle, breadcrumb-ish page name, theme toggle, the notification
 * bell (real inbox + compose, see NotificationBell.tsx), and a logout
 * button. Profile lives in the sidebar as a normal nav link (see
 * Sidebar.tsx/FarmerSidebar.tsx/DriverSidebar.tsx) rather than behind a
 * dropdown here.
 */
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useLayout } from "./LayoutProvider";
import { logout } from "@/app/actions/auth";
import NotificationBell from "./NotificationBell";
import styles from "./Header.module.css";

interface HeaderProps {
  messagesHref?: string;
  // True for farmer/driver portals: the notification bell's compose can
  // only send a request to the admin team, not pick a specific user.
  restrictedCompose?: boolean;
  previewing?: boolean;
  // Settings → Notifications → "Message alerts". Defaults to true so a
  // failed/omitted preference fetch doesn't silently mute the bell.
  notifyMessages?: boolean;
}

/**
 * `messagesHref` defaults to the admin route; FarmerShell/DriverShell
 * override it to their own portal's equivalent so the same Header works
 * for all three shells.
 */
export default function Header({
  messagesHref = "/messages",
  restrictedCompose = false,
  previewing = false,
  notifyMessages = true,
}: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { toggleMobileSidebar } = useLayout();

  // Simple breadcrumb logic based on pathname
  const routeName = pathname === "/" ? "Dashboard" : pathname.replace("/", "");

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.hamburger}
          onClick={toggleMobileSidebar}
          aria-label="Open sidebar menu"
        >
          <Menu size={20} />
        </button>
        <div className={styles.breadcrumb}>
          {routeName}
        </div>
      </div>

      <div className={styles.right}>
        <button className={styles.iconBtn} onClick={toggleTheme} aria-label="Toggle Theme">
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <NotificationBell
          restrictedCompose={restrictedCompose}
          messagesHref={messagesHref}
          previewing={previewing}
          notifyMessages={notifyMessages}
        />

        <form action={logout}>
          <button type="submit" className={styles.iconBtn} aria-label="Log out">
            <LogOut size={20} />
          </button>
        </form>
      </div>
    </header>
  );
}
