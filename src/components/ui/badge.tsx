import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        /** Neon blue — active status, current role, live indicators */
        default:
          "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)]",
        /** Muted — coming-soon phases, disabled items */
        muted:
          "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
        /** Success green — healthy systems, completed states */
        success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
        /** Warning amber — degraded / attention needed */
        warning: "border-amber-500/40 bg-amber-500/10 text-amber-400",
        /** Destructive red — errors, failures */
        destructive:
          "border-[var(--destructive)]/40 bg-[var(--destructive)]/10 text-[var(--destructive)]",
        /** Accent purple-blue — special labels */
        accent:
          "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent-foreground)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
