/**
 * Locale-pinned date/time formatters.
 * ---------------------------------------------------------------------------
 * `date.toLocaleString()` / `toLocaleTimeString()` / `toLocaleDateString()`
 * with no explicit locale resolve to whatever the *runtime environment's*
 * default locale is — which is frequently different between the Node.js
 * server process and the user's browser, even when both are "en-US"-ish.
 * That produces a real, reproducible SSR hydration mismatch (e.g. server
 * renders "01:16 pm", client renders "01:16 PM") for any component that
 * gets server-rendered with a date already in its initial props.
 *
 * Fix: always pass an explicit locale. These helpers pin "en-US" so
 * server and client always agree — use them instead of calling
 * `toLocaleString()`/etc. directly anywhere a date is rendered in JSX.
 */

const LOCALE = "en-US";

export function formatTime(input: string | Date): string {
  try {
    const date = typeof input === "string" ? new Date(input) : input;
    return date.toLocaleTimeString(LOCALE, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function formatDate(input: string | Date): string {
  try {
    const date = typeof input === "string" ? new Date(input) : input;
    return date.toLocaleDateString(LOCALE, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function formatDateTime(input: string | Date): string {
  try {
    const date = typeof input === "string" ? new Date(input) : input;
    return date.toLocaleString(LOCALE, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** Locale-pinned number formatting (commas, etc.) — same mismatch risk as dates. */
export function formatNumber(n: number): string {
  return n.toLocaleString(LOCALE);
}
