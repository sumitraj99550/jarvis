"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UserButton } from "@clerk/nextjs";
import { PanelLeftClose, PanelLeftOpen, X, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { navigation, type NavItem } from "@/lib/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Sidebar widths
// ---------------------------------------------------------------------------
const EXPANDED_W = 240; // px — w-60 equivalent
const COLLAPSED_W = 64; // px — w-16 equivalent

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  userRole?: string;
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------
export function Sidebar({
  isCollapsed,
  onToggle,
  isMobileOpen,
  onMobileClose,
  userRole,
}: SidebarProps) {
  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Mobile overlay backdrop                                             */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            key="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Desktop sidebar (always mounted, animated width)                   */}
      {/* ------------------------------------------------------------------ */}
      <motion.aside
        animate={{ width: isCollapsed ? COLLAPSED_W : EXPANDED_W }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden",
          "border-r border-[var(--glass-border)]",
          "bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)]",
          "md:flex",
        )}
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          onToggle={onToggle}
          userRole={userRole}
        />
      </motion.aside>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile drawer (slides in from left on small screens)               */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: -EXPANDED_W }}
            animate={{ x: 0 }}
            exit={{ x: -EXPANDED_W }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ width: EXPANDED_W }}
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex flex-col",
              "border-r border-[var(--glass-border)]",
              "bg-[rgb(5,7,13)] md:hidden",
            )}
          >
            {/* Close button */}
            <button
              onClick={onMobileClose}
              className="absolute top-3 right-3 rounded-md p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
            <SidebarContent
              isCollapsed={false}
              onToggle={onMobileClose}
              userRole={userRole}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Inner content (shared between desktop and mobile)
// ---------------------------------------------------------------------------
interface SidebarContentProps {
  isCollapsed: boolean;
  onToggle: () => void;
  userRole?: string;
}

function SidebarContent({
  isCollapsed,
  onToggle,
  userRole,
}: SidebarContentProps) {
  const pathname = usePathname();
  // "Have we hydrated yet" as a useSyncExternalStore read rather than an
  // effect-driven setState — same pattern as use-sidebar.ts. The
  // subscription is a no-op (this never changes after mount), so this is
  // purely a server-vs-client snapshot divergence, not something that
  // needs cascading re-renders.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div className="flex h-full flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Header — JARVIS brand + collapse toggle                            */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-[var(--glass-border)]",
          isCollapsed ? "justify-center px-0" : "justify-between px-4",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isCollapsed ? (
            <motion.div
              key="brand-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <div className="neon-glow flex size-7 items-center justify-center rounded-md bg-[var(--primary)]/10">
                <Zap className="text-neon size-4" />
              </div>
              <span className="text-neon text-base font-semibold tracking-tight">
                JARVIS
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="brand-icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="neon-glow flex size-8 items-center justify-center rounded-md bg-[var(--primary)]/10"
            >
              <Zap className="text-neon size-4" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle — hidden in mobile drawer */}
        {!isCollapsed && (
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="rounded-md p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]/40 hover:text-[var(--foreground)]"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Navigation                                                         */}
      {/* ------------------------------------------------------------------ */}
      <ScrollArea className="flex-1">
        <nav className="space-y-0.5 p-2">
          {navigation.map((group, i) => (
            <div key={group.title}>
              {i > 0 && <Separator className="my-2 opacity-50" />}

              {/* Group label — hidden when collapsed */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.p
                    key={group.title}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="mb-1 overflow-hidden px-2 text-[10px] font-semibold tracking-widest text-[var(--muted-foreground)] uppercase"
                  >
                    {group.title}
                  </motion.p>
                )}
              </AnimatePresence>

              {group.items.map((item) => (
                <NavItemRow
                  key={item.href}
                  item={item}
                  isCollapsed={isCollapsed}
                  isActive={
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href)
                  }
                />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* ------------------------------------------------------------------ */}
      {/* User footer                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="shrink-0 border-t border-[var(--glass-border)] p-3">
        <div
          className={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "gap-3",
          )}
        >
          {/* Clerk's pre-built user avatar + menu.
              Clerk's UserButton reconciles its own DOM attributes
              (data-clerk-component, className, style) after it mounts,
              which never matches what the server rendered — that's a
              guaranteed hydration mismatch, not a bug in our markup.
              Rendering a same-size skeleton until mounted, then swapping
              to the real UserButton client-side, sidesteps it entirely:
              server and first client paint agree (skeleton), and the
              swap to UserButton happens after hydration via a normal
              effect-driven state update. */}
          {mounted ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-8",
                  userButtonTrigger: "focus:shadow-none",
                },
              }}
            />
          ) : (
            <div className="size-8 shrink-0 animate-pulse rounded-full bg-[var(--muted)]" />
          )}

          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                key="user-info"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 overflow-hidden"
              >
                <p className="truncate text-xs font-medium text-[var(--foreground)]">
                  My Account
                </p>
                {userRole && (
                  <Badge variant="muted" className="mt-0.5">
                    {userRole}
                  </Badge>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Expand button — only visible when collapsed */}
        {isCollapsed && (
          <button
            onClick={onToggle}
            aria-label="Expand sidebar"
            className="mt-3 flex w-full items-center justify-center rounded-md p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]/40 hover:text-[var(--foreground)]"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual nav item row
// ---------------------------------------------------------------------------
interface NavItemRowProps {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
}

function NavItemRow({ item, isCollapsed, isActive }: NavItemRowProps) {
  const Icon = item.icon;

  const inner = (
    <span
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
        // Active state
        isActive &&
          "bg-[var(--primary)]/10 text-[var(--primary)] shadow-[inset_0_0_0_1px_rgba(61,220,255,0.2)]",
        // Idle — enabled
        !isActive &&
          !item.disabled &&
          "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/40 hover:text-[var(--foreground)]",
        // Idle — disabled (future phase)
        item.disabled && "cursor-not-allowed text-[var(--muted-foreground)]/50",
        // Collapsed: center the icon
        isCollapsed && "justify-center",
      )}
    >
      <Icon className="size-4 shrink-0" />

      {/* Label + phase badge — visible only when expanded */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="flex min-w-0 flex-1 items-center justify-between overflow-hidden whitespace-nowrap"
          >
            <span className="truncate">{item.label}</span>
            {item.phase && item.disabled && (
              <Badge variant="muted" className="ml-2 shrink-0">
                P{item.phase}
              </Badge>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );

  // Wrap disabled items in a non-navigable span; active/enabled in a Link
  const element = item.disabled ? (
    <span role="presentation">{inner}</span>
  ) : (
    <Link href={item.href} prefetch={false}>
      {inner}
    </Link>
  );

  // In collapsed mode, wrap with a tooltip showing the label
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{element}</div>
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.label}
          {item.phase && item.disabled && (
            <span className="ml-1 text-[var(--muted-foreground)]">
              · Phase {item.phase}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return element;
}
