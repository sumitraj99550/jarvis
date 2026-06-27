import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names while resolving conflicts.
 *
 * `clsx` lets us pass conditional classes (booleans, arrays, objects),
 * and `twMerge` then de-duplicates conflicting Tailwind utilities
 * (e.g. "px-2" followed by "px-4" correctly resolves to "px-4").
 *
 * Every shadcn/ui component in this project relies on this helper to
 * accept and safely extend a `className` prop.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
