"use client";

import React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

interface ShellProps {
  children: React.ReactNode;
  /** User's role string, passed down from the server layout. */
  userRole?: string;
}

/**
 * Dashboard shell — the single client component that owns layout state.
 *
 * Architecture note: this is a client component, but {children} are server
 * components. Next.js App Router supports this pattern — server components
 * passed as props/children to a client component are rendered on the server
 * and streamed in. The client component only re-renders when its own state
 * (sidebar collapse / mobile open) changes, not on every navigation.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │  Sidebar (fixed, animates width)            │
 *   │  ┌────────────────────────────────────────┐ │
 *   │  │  TopNav (fixed h-14)                   │ │
 *   │  ├────────────────────────────────────────┤ │
 *   │  │  <main> scrollable page content        │ │
 *   │  └────────────────────────────────────────┘ │
 *   └─────────────────────────────────────────────┘
 *
 * TooltipProvider wraps everything so sidebar icon tooltips (collapsed mode)
 * and any future app tooltips work without extra setup on each page.
 */
export function Shell({ children, userRole }: ShellProps) {
  const { isCollapsed, toggle, isMobileOpen, openMobile, closeMobile } =
    useSidebar();

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--background)]">
        {/* Fixed-width sidebar — Framer Motion animates the width inside */}
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={toggle}
          isMobileOpen={isMobileOpen}
          onMobileClose={closeMobile}
          userRole={userRole}
        />

        {/*
         * Content area — offset from the sidebar using CSS margin + transition.
         * On mobile (< md) the sidebar is an overlay, so margin stays 0.
         * On desktop (≥ md) the margin matches the sidebar width and
         * transitions at the same 250 ms / ease as the sidebar width animation.
         */}
        <div
          className={cn(
            "flex flex-1 flex-col overflow-hidden",
            "transition-[margin-left] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
            // Desktop only: push content right by sidebar width
            isCollapsed ? "md:ml-16" : "md:ml-60",
          )}
        >
          <TopNav onMobileMenuOpen={openMobile} />

          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
