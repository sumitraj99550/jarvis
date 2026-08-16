"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Loader2,
  AlertTriangle,
  Settings2,
  Radio,
  Square,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/format";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useWakeWordDetector } from "@/hooks/use-wake-word";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";

type Mode = "idle" | "armed" | "capturing" | "thinking" | "speaking";

type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const DEFAULT_WAKE_PHRASE = "hey jarvis";
// How long to wait after the user stops talking before treating the
// utterance as finished and sending it — this is what "listens until you
// stop, not just once" means in practice for continuous recognition,
// which (unlike one-shot mode) doesn't auto-stop on silence by itself.
const SILENCE_CUTOFF_MS = 1600;

/**
 * This whole component is a client-side voice orchestration state machine
 * wrapping browser event-driven APIs (SpeechRecognition, SpeechSynthesis,
 * fetch/ReadableStream) — it never runs on the server, so React's
 * SSR-purity concerns (stable IDs, no Date.now() during render) don't
 * actually apply the way they do for server-rendered components. A few
 * lines below carry a targeted eslint-disable with an explanation rather
 * than restructuring genuinely event-driven logic to satisfy a heuristic
 * aimed at a different class of bug (SSR/hydration mismatches).
 *
 * Architecture note (fixed after initial Phase 16 ship): this now runs
 * exactly ONE continuous SpeechRecognition instance for the whole session
 * (armed → capturing → armed → …), instead of two separate instances
 * (one for wake-word, one for command capture) racing to start/stop on
 * the same microphone. That race was the root cause of "mic works
 * sometimes, doesn't other times."
 */
export function VoiceAssistant({
  userName,
  hasApiKey,
}: {
  userName: string;
  hasApiKey: boolean;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [wakeWordArmed, setWakeWordArmed] = useState(false);
  const [continuousConvo, setContinuousConvo] = useState(true);
  const [wakePhrase, setWakePhrase] = useState(DEFAULT_WAKE_PHRASE);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const idCounter = useRef(0);
  function nextId(suffix: string) {
    idCounter.current += 1;
    return `${suffix}-${idCounter.current}`;
  }

  const tts = useTextToSpeech();
  // ONE continuous recognition instance for the entire session.
  const recognition = useSpeechRecognition({ continuous: true });
  const abortRef = useRef<AbortController | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  });

  // Keep the single recognition engine running whenever we're armed or
  // capturing; stop it when idle/thinking/speaking.
  useEffect(() => {
    if (!recognition.isSupported) return;
    if (mode === "armed" || mode === "capturing") {
      recognition.start();
    } else {
      recognition.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, recognition.isSupported]);

  const handleWakeWord = useCallback(() => {
    if (modeRef.current !== "armed") return;
    setMode("capturing");
  }, []);

  useWakeWordDetector({
    transcript: recognition.transcript,
    interimTranscript: recognition.interimTranscript,
    phrase: wakePhrase,
    enabled: wakeWordArmed && mode === "armed",
    onDetected: handleWakeWord,
    resetTranscript: recognition.resetTranscript,
  });

  // Silence-based cutoff while capturing: reset a timer on every new bit
  // of speech; if it fires, the user has stopped talking — send whatever
  // was captured. This is what a one-shot recognizer gives you for free,
  // but continuous mode (required to keep the mic open across wake-word →
  // command without a restart) doesn't auto-stop on its own.
  useEffect(() => {
    if (mode !== "capturing") return;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    const hasSpeech =
      recognition.transcript.trim() || recognition.interimTranscript.trim();
    if (!hasSpeech) return;
    silenceTimerRef.current = setTimeout(() => {
      const finalText = recognition.transcript.trim();
      if (finalText) {
        recognition.stop();
        recognition.resetTranscript();
        sendMessage(finalText);
      }
    }, SILENCE_CUTOFF_MS);
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, recognition.transcript, recognition.interimTranscript]);

  function sendMessage(text: string) {
    setMode("thinking");
    setError(null);

    const userTurn: Turn = {
      id: nextId("user"),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setTurns((prev) => [...prev, userTurn]);

    const controller = new AbortController();
    abortRef.current = controller;

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.body) throw new Error("No response body.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            const data = JSON.parse(part.slice(6)) as {
              chunk?: string;
              done?: boolean;
              error?: string;
            };
            if (data.error) throw new Error(data.error);
            if (data.chunk) fullText += data.chunk;
          }
        }

        const assistantTurn: Turn = {
          id: nextId("assistant"),
          role: "assistant",
          content: fullText || "(no response)",
          createdAt: new Date().toISOString(),
        };
        setTurns((prev) => [...prev, assistantTurn]);

        setMode("speaking");
        if (tts.isSupported && fullText.trim()) {
          speakThenResume(fullText, assistantTurn.id);
        } else {
          resumeAfterTurn();
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
        resumeAfterTurn();
      });
  }

  function speakThenResume(text: string, id: string) {
    tts.speak(text, id);
    if (speakPollRef.current) clearInterval(speakPollRef.current);
    speakPollRef.current = setInterval(() => {
      if (tts.speakingId !== id) {
        if (speakPollRef.current) clearInterval(speakPollRef.current);
        if (modeRef.current === "speaking") resumeAfterTurn();
      }
    }, 250);
  }

  /** After a turn completes (or is interrupted), decide where the session goes next. */
  function resumeAfterTurn() {
    if (continuousConvo && (wakeWordArmed || modeRef.current !== "idle")) {
      setMode(wakeWordArmed ? "armed" : "capturing");
    } else {
      setMode(wakeWordArmed ? "armed" : "idle");
    }
  }

  /** Real barge-in: stop speaking, cancel any in-flight request, resume listening immediately. */
  function interrupt() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    tts.stop();
    if (speakPollRef.current) clearInterval(speakPollRef.current);
    recognition.resetTranscript();
    setMode(
      continuousConvo
        ? wakeWordArmed
          ? "armed"
          : "capturing"
        : wakeWordArmed
          ? "armed"
          : "idle",
    );
  }

  function handleMicClick() {
    if (mode === "thinking" || mode === "speaking") {
      interrupt();
      return;
    }
    if (mode === "capturing") {
      // Manual "I'm done talking" — send immediately instead of waiting
      // for the silence timer.
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      const finalText = recognition.transcript.trim();
      recognition.stop();
      recognition.resetTranscript();
      if (finalText) sendMessage(finalText);
      else setMode(wakeWordArmed ? "armed" : "idle");
      return;
    }
    // idle or armed → start capturing directly (manual override of wake word)
    recognition.resetTranscript();
    setMode("capturing");
  }

  function endSession() {
    interrupt();
    setWakeWordArmed(false);
    recognition.stop();
    setMode("idle");
  }

  function toggleWakeWord() {
    const next = !wakeWordArmed;
    setWakeWordArmed(next);
    if (next && mode === "idle") setMode("armed");
    if (!next && mode === "armed") setMode("idle");
  }

  const isBusy = mode === "thinking" || mode === "speaking";
  const noSpeechSupport = !recognition.isSupported;
  const heardText = recognition.transcript || recognition.interimTranscript;

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">
            Phase 16 — Voice Layer (STT + Wake Word)
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">
            Voice Assistant
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className="rounded-full p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <Settings2 className="size-4" />
        </button>
      </div>

      {showSettings && (
        <Card className="mb-4">
          <CardContent className="space-y-3 pt-6">
            <div>
              <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
                Wake phrase
              </label>
              <input
                value={wakePhrase}
                onChange={(e) => setWakePhrase(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-1.5 text-sm text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--foreground)]">
                  Continuous conversation
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  Keep listening automatically after each reply, without needing
                  the wake phrase again.
                </p>
              </div>
              <Button
                variant={continuousConvo ? "default" : "outline"}
                size="sm"
                onClick={() => setContinuousConvo((v) => !v)}
              >
                {continuousConvo ? "On" : "Off"}
              </Button>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Continuous listening runs real speech recognition in this tab
              while armed/capturing — not a low-power hardware wake word. Uses
              more battery/bandwidth than a smart speaker, and only works while
              this page is open with mic access granted. Recognition accuracy
              (including hearing the wake phrase correctly) depends entirely on
              your browser and microphone — watch the &ldquo;Heard&rdquo; line
              below to see exactly what JARVIS is picking up.
            </p>
          </CardContent>
        </Card>
      )}

      {noSpeechSupport && (
        <p className="mb-4 flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          <AlertTriangle className="size-3.5" />
          Speech recognition isn&apos;t supported in this browser. Try Chrome or
          Edge — Safari and Firefox have limited or no support for the Web
          Speech API.
        </p>
      )}

      {!hasApiKey && (
        <p className="mb-4 flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          <AlertTriangle className="size-3.5" />
          GOOGLE_AI_API_KEY not set — voice replies won&apos;t work until it is.
        </p>
      )}

      {error && (
        <p className="mb-4 text-xs text-[var(--destructive)]">{error}</p>
      )}

      {/* Conversation log */}
      <div className="mb-4 flex-1 space-y-3 overflow-y-auto">
        {turns.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">
            {noSpeechSupport
              ? "Speech recognition unavailable in this browser."
              : `Hi ${userName} — tap the mic or arm wake-word listening to start talking.`}
          </p>
        )}
        {turns.map((t) => (
          <div
            key={t.id}
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
              t.role === "user"
                ? "ml-auto rounded-tr-sm bg-[var(--primary)]/15 text-[var(--foreground)]"
                : "rounded-tl-sm bg-[var(--secondary)]/50 text-[var(--foreground)]",
            )}
          >
            <p>{t.content}</p>
            <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
              {formatTime(t.createdAt)}
            </p>
          </div>
        ))}
      </div>

      {/* Live "heard" line — always visible while armed/capturing so
          mis-hearings are visible, not mysterious. */}
      {(mode === "armed" || mode === "capturing") && (
        <p className="mb-2 min-h-[1.25rem] text-center text-xs text-[var(--muted-foreground)] italic">
          {heardText
            ? `Heard: "${heardText}"`
            : mode === "armed"
              ? `Listening for "${wakePhrase}"…`
              : "Listening…"}
        </p>
      )}

      {/* Controls */}
      <div className="flex flex-col items-center gap-3 border-t border-[var(--glass-border)] pt-4">
        <StatusBadge mode={mode} />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleMicClick}
            disabled={noSpeechSupport}
            title={
              isBusy
                ? "Interrupt and start listening"
                : mode === "capturing"
                  ? "Stop and send now"
                  : "Start talking"
            }
            className={cn(
              "flex size-16 items-center justify-center rounded-full transition-all",
              mode === "capturing"
                ? "neon-glow bg-[var(--primary)] text-[var(--background)]"
                : isBusy
                  ? "bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--secondary)]/80"
                  : "text-neon bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20",
              noSpeechSupport && "cursor-not-allowed opacity-40",
            )}
          >
            {mode === "thinking" ? (
              <Loader2 className="size-6 animate-spin" />
            ) : mode === "speaking" ? (
              <Square className="size-5" />
            ) : mode === "capturing" ? (
              <Mic className="size-6" />
            ) : (
              <MicOff className="size-6" />
            )}
          </button>

          {isBusy && (
            <Button variant="outline" size="sm" onClick={interrupt}>
              <Square className="size-3.5" />
              Stop
            </Button>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant={wakeWordArmed ? "default" : "outline"}
            size="sm"
            onClick={toggleWakeWord}
            disabled={noSpeechSupport}
          >
            <Radio className="size-3.5" />
            {wakeWordArmed ? `Listening for "${wakePhrase}"` : "Arm wake word"}
          </Button>
          {mode !== "idle" && (
            <Button variant="ghost" size="sm" onClick={endSession}>
              End session
            </Button>
          )}
        </div>

        {continuousConvo && mode !== "idle" && (
          <p className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
            <Repeat className="size-3" />
            Continuous conversation on — I&apos;ll keep listening after each
            reply.
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ mode }: { mode: Mode }) {
  const label: Record<Mode, string> = {
    idle: "Idle — tap the mic to talk",
    armed: "Armed — say the wake phrase",
    capturing: "Listening — tap mic or pause to send",
    thinking: "Thinking…",
    speaking: "Speaking… (tap Stop to interrupt)",
  };
  const variant: Record<Mode, "muted" | "default" | "success"> = {
    idle: "muted",
    armed: "default",
    capturing: "success",
    thinking: "default",
    speaking: "success",
  };
  return <Badge variant={variant[mode]}>{label[mode]}</Badge>;
}
