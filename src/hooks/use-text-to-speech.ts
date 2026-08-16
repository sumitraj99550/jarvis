"use client";

/**
 * Text-to-speech (Phase 15).
 * ---------------------------------------------------------------------------
 * Uses the browser's native Web Speech API (`window.speechSynthesis`) —
 * completely free, no API key, no third-party service, works offline once
 * voices are loaded. This is real functionality, not a stub: every browser
 * that ships this API (all modern desktop/mobile browsers) genuinely speaks
 * the text out loud.
 *
 * Persisted settings (voice, rate, pitch, auto-speak) use the same
 * `useSyncExternalStore` + localStorage pattern as `useSidebar` — the
 * React-recommended way to read browser-only state without a hydration
 * mismatch: server always renders the neutral default, client reads the
 * real value, React reconciles the two without a warning.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "jarvis:tts-settings";

type StoredSettings = {
  voiceURI: string | null;
  rate: number;
  pitch: number;
  autoSpeak: boolean;
};

const DEFAULT_SETTINGS: StoredSettings = {
  voiceURI: null,
  rate: 1,
  pitch: 1,
  autoSpeak: false,
};

function readSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      voiceURI: parsed.voiceURI ?? null,
      rate: typeof parsed.rate === "number" ? parsed.rate : 1,
      pitch: typeof parsed.pitch === "number" ? parsed.pitch : 1,
      autoSpeak: parsed.autoSpeak === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings: StoredSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: JSON.stringify(settings),
        storageArea: localStorage,
      }),
    );
  } catch {
    // localStorage unavailable (private browsing, etc.) — settings just
    // won't persist across reloads, not worth surfacing an error for.
  }
}

function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSpeechSupportServerSnapshot(): boolean {
  return false;
}

function getSpeechSupportClientSnapshot(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function subscribeNever() {
  return () => {};
}

export function useTextToSpeech() {
  // Server always renders "unsupported" (no speechSynthesis on the
  // server); client immediately reconciles to the real value — same
  // pattern used for the sidebar's collapsed state.
  const isSupported = useSyncExternalStore(
    subscribeNever,
    getSpeechSupportClientSnapshot,
    getSpeechSupportServerSnapshot,
  );

  const settings = useSyncExternalStore(
    subscribeStorage,
    readSettings,
    () => DEFAULT_SETTINGS,
  );

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const speakingIdRef = useRef<string | null>(null);

  // Populate the voice list once supported — this is a genuine subscription
  // to an external event (voiceschanged), not an init-time setState, so it's
  // exactly what useEffect is for.
  useEffect(() => {
    if (!isSupported) return;
    const populateVoices = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) setVoices(list);
    };
    populateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", populateVoices);
    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        populateVoices,
      );
    };
  }, [isSupported]);

  const setVoiceURI = useCallback((uri: string | null) => {
    writeSettings({ ...readSettings(), voiceURI: uri });
  }, []);
  const setRate = useCallback((value: number) => {
    writeSettings({ ...readSettings(), rate: value });
  }, []);
  const setPitch = useCallback((value: number) => {
    writeSettings({ ...readSettings(), pitch: value });
  }, []);
  const setAutoSpeak = useCallback((value: boolean) => {
    writeSettings({ ...readSettings(), autoSpeak: value });
  }, []);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    speakingIdRef.current = null;
    setSpeakingId(null);
  }, [isSupported]);

  /** Strips markdown code fences/inline code so they aren't read aloud literally. */
  function cleanForSpeech(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, " (code block omitted) ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[*_#>]/g, "")
      .trim();
  }

  const speak = useCallback(
    (text: string, id: string) => {
      if (!isSupported || !text.trim()) return;

      // Toggle off if this exact message is already speaking.
      if (speakingIdRef.current === id) {
        stop();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;

      const voice = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        speakingIdRef.current = id;
        setSpeakingId(id);
      };
      utterance.onend = () => {
        if (speakingIdRef.current === id) {
          speakingIdRef.current = null;
          setSpeakingId(null);
        }
      };
      utterance.onerror = () => {
        if (speakingIdRef.current === id) {
          speakingIdRef.current = null;
          setSpeakingId(null);
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [
      isSupported,
      settings.rate,
      settings.pitch,
      settings.voiceURI,
      voices,
      stop,
    ],
  );

  // Stop any speech on unmount (navigating away from Command Center).
  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  return {
    isSupported,
    voices,
    voiceURI: settings.voiceURI,
    setVoiceURI,
    rate: settings.rate,
    setRate,
    pitch: settings.pitch,
    setPitch,
    autoSpeak: settings.autoSpeak,
    setAutoSpeak,
    speakingId,
    speak,
    stop,
  };
}
