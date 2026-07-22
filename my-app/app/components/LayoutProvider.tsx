/**
 * React context that tracks the admin/farmer shell's sidebar open/collapsed
 * state (desktop) and open/closed state (mobile overlay). Both AdminShell
 * and FarmerShell wrap their content in a LayoutProvider so the Sidebar,
 * Header, and shell layout can all read/toggle the same state.
 */
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface LayoutContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

/**
 * Provides sidebar state to descendants. On mount, defaults the desktop
 * sidebar to open only on wide viewports (>1024px) and auto-closes the
 * mobile overlay sidebar whenever the viewport is resized past the mobile
 * breakpoint (>768px), so it doesn't stay stuck open after a resize.
 */
export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const initialSidebarState = window.innerWidth > 1024;
    setIsSidebarOpen(initialSidebarState);

    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileSidebarOpen(false);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
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
