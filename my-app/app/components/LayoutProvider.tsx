/**
 * React context that tracks the admin/farmer shell's sidebar open/collapsed
 * state (desktop) and open/closed state (mobile overlay). Both AdminShell
 * and FarmerShell wrap their content in a LayoutProvider so the Sidebar,
 * Header, and shell layout can all read/toggle the same state.
 */
"use client";

import React, { createContext, useContext, useState, useEffect, useSyncExternalStore } from "react";

interface LayoutContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

// The server snapshot matches the original desktop-first default so the
// initial server render and hydration agree. Once hydrated, the client
// snapshot reflects the actual viewport without a setState-in-effect pass.
function subscribeToViewport(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function getViewportSidebarDefault() {
  return window.innerWidth > 1024;
}

function getServerSidebarDefault() {
  return true;
}

/**
 * Provides sidebar state to descendants. Defaults the desktop sidebar to
 * open only on wide viewports (>1024px) and auto-closes the mobile overlay
 * sidebar whenever the viewport is resized past the mobile breakpoint
 * (>768px), so it doesn't stay stuck open after a resize.
 */
export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const viewportSidebarDefault = useSyncExternalStore(
    subscribeToViewport,
    getViewportSidebarDefault,
    getServerSidebarDefault
  );
  const [sidebarOverride, setSidebarOverride] = useState<boolean | null>(null);
  const isSidebarOpen = sidebarOverride ?? viewportSidebarDefault;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock body scroll while the mobile drawer is open — otherwise the page
  // behind it keeps scrolling under a touch drag, which is what made the
  // drawer feel like a floating panel rather than real navigation.
  useEffect(() => {
    if (isMobileSidebarOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [isMobileSidebarOpen]);

  const toggleSidebar = () => setSidebarOverride((current) => !(current ?? viewportSidebarDefault));
  const toggleMobileSidebar = () => setIsMobileSidebarOpen(prev => !prev);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  return (
    <LayoutContext.Provider
      value={{
        isSidebarOpen,
        toggleSidebar,
        isMobileSidebarOpen,
        toggleMobileSidebar,
        closeMobileSidebar,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

/** Hook for consuming the layout context; throws if called outside a LayoutProvider so misuse fails loudly during development. */
export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
