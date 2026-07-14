"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "jarvis-sidebar-collapsed";

/**
 * Read the persisted sidebar preference synchronously.
 *
 * Using a useState lazy initializer (the function passed to useState) instead
 * of a useEffect means:
 *  - No state update inside an effect (satisfies the react-hooks lint rule).
 *  - The value is read before the first render, so there is no mid-paint
 *    correction and no layout flash on the client.
 *  - On the server (typeof window === 'undefined') we return false to match
 *    the initial HTML and avoid React hydration warnings. The client will
 *    immediately use the saved preference from localStorage.
 */
function readStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false; // SSR: neutral default
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false; // private browsing / storage quota exceeded
  }
}

/**
 * Sidebar collapse + mobile-open state.
 *
 * isCollapsed  — desktop sidebar width toggle (persisted to localStorage)
 * isMobileOpen — mobile drawer visibility (transient, not persisted)
 */
export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(readStoredCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore write failures
      }
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  return { isCollapsed, toggle, isMobileOpen, openMobile, closeMobile };
}
