"use client";

/**
 * Wake-word phrase detector (Phase 16, revised).
 * ---------------------------------------------------------------------------
 * Originally this hook owned its own separate SpeechRecognition instance.
 * That caused a real bug: Voice Assistant also needed its own recognition
 * instance for command capture, and browsers don't reliably support two
 * concurrent SpeechRecognition sessions on the same mic — starting one
 * while the other was still tearing down produced exactly the "mic works
 * sometimes, doesn't other times" symptom reported after Phase 16 shipped.
 *
 * Fix: Voice Assistant now runs a SINGLE continuous SpeechRecognition
 * instance for the entire session (armed → capturing → armed → …). This
 * hook no longer creates its own recognition — it just watches whatever
 * transcript text you feed it and calls `onDetected()` when the phrase
 * appears, then asks you to clear the buffer via `resetTranscript`.
 */

import { useEffect, useRef } from "react";

const DEFAULT_WAKE_PHRASE = "hey jarvis";

export function useWakeWordDetector(options: {
  transcript: string;
  interimTranscript: string;
  phrase?: string;
  enabled: boolean;
  onDetected: () => void;
  resetTranscript: () => void;
}) {
  const phrase = (options.phrase ?? DEFAULT_WAKE_PHRASE).toLowerCase();

  const onDetectedRef = useRef(options.onDetected);
  const resetRef = useRef(options.resetTranscript);
  useEffect(() => {
    onDetectedRef.current = options.onDetected;
    resetRef.current = options.resetTranscript;
  });

  // Reacts to a real external speech-recognition event, not synchronizing
  // derived render state — see the same note in voice-assistant.tsx.
  useEffect(() => {
    if (!options.enabled) return;
    const combined =
      `${options.transcript} ${options.interimTranscript}`.toLowerCase();
    if (combined.includes(phrase)) {
      resetRef.current();
      onDetectedRef.current();
    }
  }, [options.enabled, options.transcript, options.interimTranscript, phrase]);
}
