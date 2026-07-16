"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "./ThemeProvider";
import styles from "../LandingPage.module.css";

export default function LandingNav() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={clsx(styles.nav, scrolled && styles.navScrolled)}>
      <Link href="/" className={styles.navBrand}>
        <Image src="/logo.png" alt="" width={28} height={28} />
        <span>Smart PMB</span>
      </Link>

      <nav className={styles.navLinks}>
        <a href="#about">About</a>
        <a href="#features">Features</a>
        <a href="#get-started">Get started</a>
      </nav>

      <div className={styles.navActions}>
        <button
          type="button"
          className={styles.navIconBtn}
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <Link href="/login" className={styles.navGhostBtn}>
          Log in
        </Link>
        <Link href="/signup/farmer" className={styles.navPrimaryBtn}>
          Sign up
          <ArrowRight size={15} className={styles.navPrimaryBtnArrow} />
        </Link>
      </div>
    </header>
  );
}
