"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu, Bell, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { navigation } from "@/lib/navigation";

interface TopNavProps {
  onMobileMenuOpen: () => void;
}

/** Resolve a human-readable title from the current pathname */
function usePageTitle(): string {
  const pathname = usePathname();

  // Walk every nav item to find a label match
  for (const group of navigation) {
    for (const item of group.items) {
      if (item.href === "/dashboard" && pathname === "/dashboard") {
        return "Dashboard";
      }
      if (item.href !== "/dashboard" && pathname.startsWith(item.href)) {
        return item.label;
      }
    }
  }

  // Fallback: capitalise the last path segment
  const segment = pathname.split("/").filter(Boolean).pop() ?? "Dashboard";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function TopNav({ onMobileMenuOpen }: TopNavProps) {
  const pageTitle = usePageTitle();

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-4 px-4",
        "border-b border-[var(--glass-border)]",
        "bg-[var(--background)]/80 backdrop-blur-[16px]",
      )}
    >
      {/* Mobile hamburger — hidden on md+ */}
      <button
        onClick={onMobileMenuOpen}
        aria-label="Open navigation menu"
        className="rounded-md p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]/40 hover:text-[var(--foreground)] md:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/* Mobile JARVIS brand — visible only when sidebar is hidden */}
      <div className="flex items-center gap-2 md:hidden">
        <Zap className="text-neon size-4" />
        <span className="text-neon text-sm font-semibold">JARVIS</span>
      </div>

      {/* Page title — desktop */}
      <h1 className="hidden text-sm font-medium text-[var(--foreground)] md:block">
        {pageTitle}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        {/* System status indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <span className="hidden text-[11px] text-[var(--muted-foreground)] sm:inline">
            All systems online
          </span>
        </div>

        {/* Notification bell — wired up in Phase 18 */}
        <button
          aria-label="Notifications (coming in Phase 18)"
          title="Notifications — Phase 18"
          className="relative rounded-md p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]/40 hover:text-[var(--foreground)]"
        >
          <Bell className="size-4" />
          {/* Badge placeholder */}
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[var(--primary)] opacity-0" />
        </button>
      </div>
    </header>
  );
}
