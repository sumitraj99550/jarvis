"use client";

/**
 * Speech-to-text (Phase 16).
 * ---------------------------------------------------------------------------
 * Uses the browser's native Web Speech API (`SpeechRecognition` /
 * `webkitSpeechRecognition`) — free, no API key, no third-party service.
 * This is real functionality where it's supported, not a stub: Chrome and
 * Edge (desktop + Android) implement it fully. Firefox and Safari have
 * partial or no support — `isSupported` reflects that honestly rather than
 * pretending it works everywhere.
 *
 * Two modes:
 *   - One-shot dictation (`continuous: false`): used for push-to-talk /
 *     "type by voice" in Command Center's input.
 *   - Continuous listening (`continuous: true`): used for the wake-word
 *     listener, which needs to keep listening indefinitely.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API has no official TypeScript lib entry — these are the
// minimal real shapes the browser actually provides.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(options?: {
  continuous?: boolean;
  lang?: string;
}) {
  const [isSupported] = useState(() => getRecognitionConstructor() !== null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Tracks whether the caller wants listening to continue — lets us
  // auto-restart continuous mode when the browser silently stops it
  // (Chrome stops continuous recognition every ~60s of silence).
  const shouldListenRef = useRef(false);

  useEffect(() => {
    const Ctor = getRecognitionConstructor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = options?.continuous ?? false;
    recognition.interimResults = true;
    recognition.lang = options?.lang ?? "en-US";

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]!;
        if (result.isFinal) {
          finalChunk += result[0].transcript;
        } else {
          interimChunk += result[0].transcript;
        }
      }
      if (finalChunk) {
        setTranscript((prev) =>
          (prev ? `${prev} ${finalChunk}` : finalChunk).trim(),
        );
      }
      setInterimTranscript(interimChunk);
    };

    recognition.onerror = (event) => {
      // "no-speech" and "aborted" fire constantly in continuous mode and
      // aren't real errors — everything else is worth surfacing.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(event.error);
      }
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if the caller still wants continuous listening
      // (browsers stop continuous recognition periodically on their own).
      if (shouldListenRef.current && options?.continuous) {
        try {
          recognition.start();
        } catch {
          // Already starting/started — ignore.
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onstart = null;
      recognition.onend = null;
      recognition.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    shouldListenRef.current = true;
    try {
      recognitionRef.current.start();
    } catch {
      // Already listening — ignore (common when called twice quickly).
    }
  }, []);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    resetTranscript,
  };
}
