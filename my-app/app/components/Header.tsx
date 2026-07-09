"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, Bell } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useLayout } from "./LayoutProvider";
import styles from "./Header.module.css";

interface HeaderProps {
  userName?: string;
  roleLabel?: string;
}

export default function Header({ userName = "Admin User", roleLabel }: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { toggleMobileSidebar } = useLayout();

  const avatarLetter = userName.trim().charAt(0).toUpperCase() || "?";

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
        
        <button className={styles.iconBtn} aria-label="Notifications">
          <Bell size={20} />
        </button>

        <div className={styles.profile}>
          <div className={styles.avatar}>{avatarLetter}</div>
          <span className={styles.profileName}>
            {userName}
            {roleLabel ? ` · ${roleLabel}` : ""}
          </span>
        </div>
      </div>
    </header>
  );
}
