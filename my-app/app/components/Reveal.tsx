/**
 * Scroll-triggered fade/slide-in wrapper used on the public landing page.
 * Wraps `children` in a div that gets a "visible" class the first time it
 * scrolls into the viewport, letting CSS handle the actual animation.
 */
"use client";

import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import styles from "../LandingPage.module.css";

/**
 * `delay` (ms) staggers the CSS transition-delay so multiple Reveal-wrapped
 * elements can animate in sequence rather than all at once.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Watch for the wrapper entering the viewport (15% visible, with a
  // slight bottom margin so it triggers a bit before reaching the edge),
  // then disconnect — the reveal only needs to happen once.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={clsx(styles.reveal, visible && styles.revealVisible, className)}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
