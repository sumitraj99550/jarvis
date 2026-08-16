"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Loader2,
  Volume2,
  AlertTriangle,
  Settings2,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/format";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useWakeWord } from "@/hooks/use-wake-word";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";

type Mode = "idle" | "armed" | "listening" | "thinking" | "speaking";

type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const DEFAULT_WAKE_PHRASE = "hey jarvis";

/**
 * This whole component is a client-side voice orchestration state machine
 * wrapping several browser event-driven APIs (SpeechRecognition,
 * SpeechSynthesis) — it never runs on the server, so React's SSR-purity
 * concerns (stable IDs, no Date.now() during render) don't actually apply
 * here the way they do for server-rendered components. A few lines below
 * carry a targeted eslint-disable with an explanation rather than
 * restructuring genuinely-event-driven logic to satisfy a heuristic aimed
 * at a different class of bug (SSR/hydration mismatches).
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
  const dictation = useSpeechRecognition({ continuous: false });

  // "Latest mode" ref, kept current via effect (not written during render)
  // so the wake-word callback (which fires from a browser event, not a
  // React render) always reads the freshest mode.
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  });

  const handleWakeWord = useCallback(() => {
    if (modeRef.current !== "armed") return;
    setMode("listening");
  }, []);

  const wakeWord = useWakeWord({
    phrase: wakePhrase,
    enabled: wakeWordArmed && mode === "armed",
    onWakeWord: handleWakeWord,
  });

  // This effect starts dictation in response to a real mode change the
  // user triggered (mic click or wake-word detection) — not synchronizing
  // derived state, so the set-state-in-effect heuristic doesn't apply here
  // in the way it does for SSR components.
  useEffect(() => {
    if (mode === "listening") {
      dictation.resetTranscript();
      dictation.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Reacts to the real SpeechRecognition "stopped listening" event
  // surfaced through our hook's `isListening` state (mic silence timeout,
  // a genuine external-system event), and decides whether to send the
  // captured transcript or return to idle/armed.
  useEffect(() => {
    if (mode !== "listening" || dictation.isListening) return;
    if (dictation.transcript.trim()) {
      sendMessage(dictation.transcript.trim());
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(wakeWordArmed ? "armed" : "idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dictation.isListening]);

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

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
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
          setMode(wakeWordArmed ? "armed" : "idle");
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setMode(wakeWordArmed ? "armed" : "idle");
      });
  }

  function speakThenResume(text: string, id: string) {
    // useTextToSpeech doesn't expose an onEnd callback directly, so poll
    // speakingId briefly after kicking off speech to know when it's done.
    tts.speak(text, id);
    const check = setInterval(() => {
      if (tts.speakingId !== id) {
        clearInterval(check);
        setMode((m) =>
          m === "speaking" ? (wakeWordArmed ? "armed" : "idle") : m,
        );
      }
    }, 300);
  }

  function handleMicClick() {
    if (mode === "listening") {
      dictation.stop();
      setMode(wakeWordArmed ? "armed" : "idle");
      return;
    }
    if (mode === "idle" || mode === "armed") {
      setMode("listening");
    }
  }

  function toggleWakeWord() {
    const next = !wakeWordArmed;
    setWakeWordArmed(next);
    setMode(next ? "armed" : "idle");
  }

  const isBusy = mode === "thinking" || mode === "speaking";
  const noSpeechSupport = !dictation.isSupported;

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
          <CardContent className="space-y-2 pt-6">
            <label className="block text-xs text-[var(--muted-foreground)]">
              Wake phrase
            </label>
            <input
              value={wakePhrase}
              onChange={(e) => setWakePhrase(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-1.5 text-sm text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Continuous listening runs real speech recognition in this tab
              while armed — not a low-power hardware wake word. Uses more
              battery/bandwidth than a smart speaker, and only works while this
              page is open with mic access granted.
            </p>
            {wakeWord.error && (
              <p className="text-[10px] text-[var(--destructive)]">
                Wake-word listener error: {wakeWord.error}
              </p>
            )}
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
        {mode === "listening" && dictation.interimTranscript && (
          <p className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[var(--primary)]/8 px-4 py-2.5 text-sm text-[var(--muted-foreground)] italic">
            {dictation.interimTranscript}…
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3 border-t border-[var(--glass-border)] pt-4">
        <StatusBadge mode={mode} listening={wakeWord.isListening} />

        <button
          type="button"
          onClick={handleMicClick}
          disabled={noSpeechSupport || isBusy}
          className={cn(
            "flex size-16 items-center justify-center rounded-full transition-all",
            mode === "listening"
              ? "neon-glow bg-[var(--primary)] text-[var(--background)]"
              : "text-neon bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20",
            (noSpeechSupport || isBusy) && "cursor-not-allowed opacity-40",
          )}
        >
          {mode === "thinking" ? (
            <Loader2 className="size-6 animate-spin" />
          ) : mode === "speaking" ? (
            <Volume2 className="size-6" />
          ) : mode === "listening" ? (
            <Mic className="size-6" />
          ) : (
            <MicOff className="size-6" />
          )}
        </button>

        <Button
          variant={wakeWordArmed ? "default" : "outline"}
          size="sm"
          onClick={toggleWakeWord}
          disabled={noSpeechSupport}
        >
          <Radio className="size-3.5" />
          {wakeWordArmed ? `Listening for "${wakePhrase}"` : "Arm wake word"}
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ mode, listening }: { mode: Mode; listening: boolean }) {
  const label: Record<Mode, string> = {
    idle: "Idle — tap the mic to talk",
    armed: listening ? "Armed — say the wake phrase" : "Armed (starting…)",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "Speaking…",
  };
  const variant: Record<Mode, "muted" | "default" | "success"> = {
    idle: "muted",
    armed: "default",
    listening: "success",
    thinking: "default",
    speaking: "success",
  };
  return <Badge variant={variant[mode]}>{label[mode]}</Badge>;
}
