"use client";

/**
 * Mic test/playback (voice reliability fix). Records a short clip via
 * `MediaRecorder` and plays it back — lets the user confirm the
 * microphone itself is being captured, independent of whether
 * SpeechRecognition/the wake word is working. Separates "is my mic even
 * on" from "is the wake word matching what I said" as two different
 * things to debug.
 */

import { useCallback, useRef, useState } from "react";

const TEST_DURATION_MS = 2500;

export function useMicTest() {
  const [state, setState] = useState<
    "idle" | "recording" | "playing" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const runTest = useCallback(async () => {
    setError(null);
    setState("recording");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunks.push(e.data);

      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start();
      await new Promise((r) => setTimeout(r, TEST_DURATION_MS));
      recorder.stop();
      await stopped;
      stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      setState("playing");
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.play().catch(() => resolve());
      });
      URL.revokeObjectURL(url);
      setState("idle");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't access the microphone for the test.",
      );
      setState("error");
    }
  }, []);

  return { state, error, runTest };
}
