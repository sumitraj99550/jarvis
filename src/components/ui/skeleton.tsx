import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton loading placeholder.
 *
 * Drop it anywhere you'd otherwise show nothing while data is loading.
 * Match the className dimensions to the content it's standing in for so
 * there's no layout shift when real content arrives.
 *
 * Example:
 *   <Skeleton className="h-4 w-32" />           // short text line
 *   <Skeleton className="h-24 w-full" />         // card body
 *   <Skeleton className="size-9 rounded-full" /> // avatar circle
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-[var(--muted)]", className)}
      {...props}
    />
  );
}

export { Skeleton };
