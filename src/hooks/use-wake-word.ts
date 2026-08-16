"use client";

/**
 * Wake word listener (Phase 16).
 * ---------------------------------------------------------------------------
 * Runs continuous speech recognition in the background and calls
 * `onWakeWord()` whenever the transcript contains the configured phrase
 * (default "hey jarvis"). Built on top of `useSpeechRecognition` in
 * continuous mode — same real browser API, no server involvement.
 *
 * Note on "wake word" here: this is NOT a low-power always-on hardware wake
 * word detector (like a smart speaker's on-device DSP) — it's continuous
 * cloud/on-device speech recognition running in the tab, which uses more
 * battery/bandwidth than a true wake-word chip and only works while the
 * page is open and the mic permission is granted. That's an honest
 * limitation of doing this in a browser, not a shortcut we're hiding.
 */

import { useEffect, useRef } from "react";
import { useSpeechRecognition } from "./use-speech-recognition";

const DEFAULT_WAKE_PHRASE = "hey jarvis";

export function useWakeWord(options?: {
  phrase?: string;
  enabled: boolean;
  onWakeWord: () => void;
}) {
  const phrase = (options?.phrase ?? DEFAULT_WAKE_PHRASE).toLowerCase();
  const enabled = options?.enabled ?? false;

  // "Latest callback" ref — kept current via an effect (not written during
  // render), so the transcript-watching effect below can always call the
  // freshest `onWakeWord` without needing it in its dependency array.
  const onWakeWordRef = useRef(options?.onWakeWord);
  useEffect(() => {
    onWakeWordRef.current = options?.onWakeWord;
  });

  const recognition = useSpeechRecognition({ continuous: true });

  // Start/stop continuous listening based on `enabled`.
  useEffect(() => {
    if (!recognition.isSupported) return;
    if (enabled) {
      recognition.start();
    } else {
      recognition.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, recognition.isSupported]);

  // Watch the transcript for the wake phrase. Calling the consumer's
  // `onWakeWord` here is a real side effect (notifying an external
  // caller) — any UI state that callback wants to update happens in the
  // consumer's own code, not inside this hook, so this hook itself never
  // calls setState from within the effect body.
  useEffect(() => {
    const combined =
      `${recognition.transcript} ${recognition.interimTranscript}`.toLowerCase();
    if (combined.includes(phrase)) {
      recognition.resetTranscript();
      onWakeWordRef.current?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recognition.transcript, recognition.interimTranscript, phrase]);

  return {
    isSupported: recognition.isSupported,
    isListening: recognition.isListening,
    error: recognition.error,
  };
}
