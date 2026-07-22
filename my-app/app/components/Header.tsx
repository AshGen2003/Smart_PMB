/**
 * Top header bar shared by both AdminShell and FarmerShell: mobile sidebar
 * toggle, breadcrumb-ish page name, theme toggle, the notification bell
 * (real inbox + compose, see NotificationBell.tsx), and a profile dropdown
 * menu with links to profile/settings and a logout button.
 */
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, LogOut, Settings, User } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useLayout } from "./LayoutProvider";
import { logout } from "@/app/actions/auth";
import NotificationBell from "./NotificationBell";
import styles from "./Header.module.css";

interface HeaderProps {
  userName?: string;
  roleLabel?: string;
  profileHref?: string;
  settingsHref?: string;
  profilePictureUrl?: string | null;
  isFarmer?: boolean;
  previewing?: boolean;
}

/**
 * `profileHref`/`settingsHref` default to the admin routes (`/profile`,
 * `/settings`); FarmerShell overrides them to the farmer-portal
 * equivalents so the same Header works for both shells.
 */
export default function Header({
  userName = "Admin User",
  roleLabel,
  profileHref = "/profile",
  settingsHref = "/settings",
  profilePictureUrl,
  isFarmer = false,
  previewing = false,
}: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { toggleMobileSidebar } = useLayout();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const avatarLetter = userName.trim().charAt(0).toUpperCase() || "?";

  // Simple breadcrumb logic based on pathname
  const routeName = pathname === "/" ? "Dashboard" : pathname.replace("/", "");

  // Close the profile dropdown when the user clicks anywhere outside it.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

        <NotificationBell isFarmer={isFarmer} previewing={previewing} />

        <div className={styles.profileWrap} ref={menuRef}>
          <button
            type="button"
            className={styles.profile}
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profilePictureUrl} alt="" className={styles.avatarImage} />
            ) : (
              <div className={styles.avatar}>{avatarLetter}</div>
            )}
            <span className={styles.profileName}>
              {userName}
              {roleLabel ? ` · ${roleLabel}` : ""}
            </span>
          </button>

          {menuOpen && (
            <div className={styles.profileMenu} role="menu">
              <div className={styles.profileMenuHeader}>
                {profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profilePictureUrl} alt="" className={styles.avatarImage} />
                ) : (
                  <div className={styles.avatar}>{avatarLetter}</div>
                )}
                <div>
                  <div className={styles.menuName}>{userName}</div>
                  {roleLabel && <div className={styles.menuRole}>{roleLabel}</div>}
                </div>
              </div>
              <div className={styles.profileMenuDivider} />
              <Link
                href={profileHref}
                className={styles.profileMenuItem}
                onClick={() => setMenuOpen(false)}
              >
                <User size={16} /> My Profile
              </Link>
              <Link
                href={settingsHref}
                className={styles.profileMenuItem}
                onClick={() => setMenuOpen(false)}
              >
                <Settings size={16} /> Settings
              </Link>
              <div className={styles.profileMenuDivider} />
              <form action={logout}>
                <button type="submit" className={styles.profileMenuItem}>
                  <LogOut size={16} /> Log out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
