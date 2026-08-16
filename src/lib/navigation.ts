import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Terminal,
  Mic2,
  Share2,
  Megaphone,
  CreditCard,
  Headphones,
  FileText,
  BookOpen,
  CheckSquare,
  CalendarDays,
  Settings,
  Zap,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * Phase this feature ships in — displayed as a muted badge on disabled
   * items. Omit if the feature isn't concretely scheduled to a specific
   * phase yet (don't guess a number just to fill the badge).
   */
  phase?: number;
  /** Disabled items are rendered but not navigable (future phases) */
  disabled?: boolean;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

/**
 * Master navigation map for the full JARVIS 20-phase roadmap.
 *
 * Convention:
 *  - Enabled items: fully interactive, live in the current build
 *  - Disabled items: visible placeholder, shows the phase they unlock in
 *
 * To activate an item in a future phase:
 *  1. Remove `disabled: true`
 *  2. Create the route at `href`
 *  That's it — the sidebar picks up the change automatically.
 */
export const navigation: NavGroup[] = [
  {
    title: "Main",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Command Center",
        href: "/dashboard/command",
        icon: Terminal,
      },
      {
        label: "Voice Assistant",
        href: "/dashboard/voice",
        icon: Mic2,
        phase: 16,
      },
      {
        label: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        disabled: true,
      },
    ],
  },
  {
    title: "Business",
    items: [
      {
        label: "Social Media",
        href: "/dashboard/social",
        icon: Share2,
        phase: 10,
      },
      {
        label: "Meta Ads",
        href: "/dashboard/ads",
        icon: Megaphone,
        phase: 12,
      },
      {
        label: "Revenue",
        href: "/dashboard/revenue",
        icon: CreditCard,
        phase: 11,
      },
    ],
  },
  {
    title: "Intelligence",
    items: [
      {
        label: "Support Center",
        href: "/dashboard/support",
        icon: Headphones,
        phase: 13,
      },
      {
        label: "Daily Briefings",
        href: "/dashboard/briefings",
        icon: FileText,
        phase: 14,
      },
      {
        label: "Knowledge Base",
        href: "/dashboard/knowledge",
        icon: BookOpen,
        phase: 17,
        disabled: true,
      },
    ],
  },
  {
    title: "Workspace",
    items: [
      {
        label: "Tasks",
        href: "/dashboard/tasks",
        icon: CheckSquare,
        phase: 18,
        disabled: true,
      },
      {
        label: "Calendar",
        href: "/dashboard/calendar",
        icon: CalendarDays,
        phase: 18,
        disabled: true,
      },
      {
        label: "Automations",
        href: "/dashboard/automations",
        icon: Zap,
        disabled: true,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Audit Logs",
        href: "/dashboard/audit",
        icon: ShieldCheck,
        phase: 8,
      },
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        phase: 19,
        disabled: true,
      },
    ],
  },
];
