"use client";

/**
 * Microphone permission tracking (Voice reliability fix, post-Phase-16).
 * ---------------------------------------------------------------------------
 * Root cause this addresses: browsers can revoke/lose mic permission mid
 * session (tab backgrounded and re-foregrounded, OS-level permission
 * change, user dismissing a prompt) with zero visible error — the
 * SpeechRecognition engine just silently stops picking anything up. This
 * hook surfaces the real permission state so the UI can show a clear
 * "microphone access needed" banner instead of a wake word that quietly
 * never triggers.
 *
 * Uses the real Permissions API (`navigator.permissions.query`) where
 * supported (Chrome/Edge). Firefox doesn't support querying "microphone"
 * via the Permissions API — for browsers where the query itself fails,
 * status stays "unknown" rather than guessing, and the UI treats
 * "unknown" the same as "prompt" (show the enable button, since we
 * genuinely don't know).
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type MicPermissionStatus = "unknown" | "granted" | "denied" | "prompt";

export function useMicPermission() {
  const [status, setStatus] = useState<MicPermissionStatus>("unknown");
  const permissionStatusRef = useRef<PermissionStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Querying/subscribing to the real browser permission state is a
    // genuine external-system synchronization (same category as the
    // data-fetching effects in notification-bell.tsx / calendar-view.tsx),
    // not a derived-state calculation.
    async function query() {
      if (typeof navigator === "undefined" || !navigator.permissions?.query) {
        return; // stays "unknown" — Permissions API unsupported here
      }
      try {
        const result = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        if (cancelled) return;
        permissionStatusRef.current = result;
        setStatus(result.state as MicPermissionStatus);
        result.onchange = () => {
          setStatus(result.state as MicPermissionStatus);
        };
      } catch {
        // Browser doesn't support querying "microphone" (e.g. Firefox) —
        // leave status as "unknown", UI treats that like "prompt".
      }
    }

    query();
    return () => {
      cancelled = true;
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }
    };
  }, []);

  /** Explicitly requests mic access — triggers the browser's native prompt if needed. */
  const requestAccess = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setStatus("granted");
      return true;
    } catch {
      setStatus("denied");
      return false;
    }
  }, []);

  return { status, requestAccess };
}
