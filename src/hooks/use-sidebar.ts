"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "jarvis-sidebar-collapsed";

// ---------------------------------------------------------------------------
// useSyncExternalStore callbacks
// ---------------------------------------------------------------------------
// This is the React 18 recommended pattern for reading localStorage with SSR.
//
// getServerSnapshot always returns false — this is what the server renders.
// getClientSnapshot reads the real value from localStorage.
//
// When the two differ, React knows it's an intentional server/client
// divergence (not a bug) and skips the hydration-mismatch warning. It
// immediately re-renders on the client with the real value before the first
// visible paint, so the user never sees a flash.

function subscribe(callback: () => void) {
  // Listen for changes from other tabs / manual dispatchEvent calls
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getClientSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  // Server always returns the neutral default — avoids HTML mismatch
  return false;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Sidebar collapse + mobile-open state.
 *
 * isCollapsed  — desktop collapse (persisted to localStorage, SSR-safe)
 * isMobileOpen — mobile drawer (transient, session-only)
 */
export function useSidebar() {
  const isCollapsed = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggle = useCallback(() => {
    try {
      const next = localStorage.getItem(STORAGE_KEY) !== "true";
      localStorage.setItem(STORAGE_KEY, String(next));
      // Notify useSyncExternalStore subscribers (including this hook)
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: String(next),
          storageArea: localStorage,
        }),
      );
    } catch {
      // localStorage unavailable — collapse state is just not persisted
    }
  }, []);

  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  return { isCollapsed, toggle, isMobileOpen, openMobile, closeMobile };
}
