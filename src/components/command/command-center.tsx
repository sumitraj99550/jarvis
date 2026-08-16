"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Zap,
  AlertCircle,
  User,
  Cpu,
  Wrench,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Volume2,
  VolumeX,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import {
  ApprovalCard,
  ApprovalResultCard,
  type PendingApproval,
} from "./approval-card";
import type { AgentEvent, ToolRecord } from "@/lib/hermes/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  streaming?: boolean;
  tools?: ToolRecord[];
  /** Marks this message as the result of an approval action */
  approvalResult?: "executed" | "rejected";
};

type ActivityItem =
  | { id: string; kind: "status"; message: string }
  | { id: string; kind: "tool_start"; name: string; label: string }
  | {
      id: string;
      kind: "tool_done";
      name: string;
      label: string;
      summary: string;
    };

interface CommandCenterProps {
  initialMessages: ChatMessage[];
  userName: string;
  hasApiKey: boolean;
}

const SUGGESTIONS = [
  "What can you help me with?",
  "Create a task: Review quarterly report",
  "What are my current dashboard stats?",
  "What time is it right now?",
  "Clear all my tasks",
];

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function CommandCenter({
  initialMessages,
  userName,
  hasApiKey,
}: CommandCenterProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hermesMode, setHermesMode] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [showActivity, setShowActivity] = useState(false);
  const [pendingApproval, setPendingApproval] =
    useState<PendingApproval | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activityCounter = useRef(0);

  // Phase 15 — Text-to-speech (real, browser-native Web Speech API)
  const tts = useTextToSpeech();
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const autoSpokenIds = useRef<Set<string>>(new Set());

  // When an assistant message finishes streaming, speak it once if
  // auto-speak is on. Tracked via a ref set so it never re-speaks a
  // message that's already been read (e.g. on unrelated re-renders).
  useEffect(() => {
    if (!tts.autoSpeak || !tts.isSupported) return;
    const last = messages[messages.length - 1];
    if (
      last &&
      last.role === "assistant" &&
      !last.streaming &&
      !last.approvalResult &&
      last.content.trim() &&
      !autoSpokenIds.current.has(last.id)
    ) {
      autoSpokenIds.current.add(last.id);
      tts.speak(last.content, last.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, tts.autoSpeak, tts.isSupported]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, activity, pendingApproval]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // -------------------------------------------------------------------------
  // Unified SSE consumer (/api/chat and /api/agent share the same format)
  // -------------------------------------------------------------------------
  const consumeStream = useCallback(
    async (res: Response, streamId: string, isAgent: boolean) => {
      if (!res.body) throw new Error("No response body.");

      setMessages((prev) => [
        ...prev,
        {
          id: streamId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          streaming: true,
        },
      ]);
      setIsLoading(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalTools: ToolRecord[] = [];

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;

          let event: AgentEvent;
          try {
            event = JSON.parse(line.slice(6)) as AgentEvent;
          } catch {
            continue;
          }

          if (event.type === "error") throw new Error(event.message);

          if (isAgent) {
            if (event.type === "status") {
              activityCounter.current += 1;
              setActivity((prev) => [
                ...prev,
                {
                  id: `a-${activityCounter.current}`,
                  kind: "status",
                  message: event.message,
                },
              ]);
            } else if (event.type === "tool_start") {
              activityCounter.current += 1;
              setActivity((prev) => [
                ...prev,
                {
                  id: `a-${activityCounter.current}`,
                  kind: "tool_start",
                  name: event.name,
                  label: event.label,
                },
              ]);
            } else if (event.type === "tool_done") {
              setActivity((prev) =>
                prev.map((a) =>
                  a.kind === "tool_start" && a.name === event.name
                    ? {
                        id: a.id,
                        kind: "tool_done",
                        name: event.name,
                        label: event.label,
                        summary: event.summary,
                      }
                    : a,
                ),
              );
            }

            // Phase 8: approval gate — pause here and show the ApprovalCard
            if (event.type === "approval_required") {
              // Remove the empty streaming placeholder (no content yet)
              setMessages((prev) => prev.filter((m) => m.id !== streamId));
              setShowActivity(false);
              setActivity([]);
              setPendingApproval({
                auditLogId: event.auditLogId,
                toolName: event.toolName,
                toolLabel: event.toolLabel,
                riskLevel: event.riskLevel,
                description: event.description,
                args: event.args,
              });
              break outer;
            }
          }

          if (event.type === "chunk") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamId
                  ? { ...m, content: m.content + event.content }
                  : m,
              ),
            );
          }

          if (event.type === "done") {
            finalTools = event.tools ?? [];
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamId
                  ? { ...m, id: event.id, streaming: false, tools: finalTools }
                  : m,
              ),
            );
            setShowActivity(false);
            setActivity([]);
            break outer;
          }
        }
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Approve / Reject handlers
  // -------------------------------------------------------------------------
  const handleApprove = useCallback(async (auditLogId: string) => {
    try {
      const res = await fetch("/api/agent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditLogId }),
      });
      const data = (await res.json()) as {
        executed?: boolean;
        response?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Approval failed.");

      setPendingApproval(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `approved-${Date.now()}`,
          role: "assistant",
          content: data.response ?? "Action completed.",
          createdAt: new Date().toISOString(),
          approvalResult: "executed",
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval request failed.");
    }
  }, []);

  const handleReject = useCallback(async (auditLogId: string) => {
    try {
      const res = await fetch("/api/agent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditLogId, reject: true }),
      });
      const data = (await res.json()) as {
        rejected?: boolean;
        response?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Rejection failed.");

      setPendingApproval(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `rejected-${Date.now()}`,
          role: "assistant",
          content: data.response ?? "Action cancelled.",
          createdAt: new Date().toISOString(),
          approvalResult: "rejected",
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Rejection request failed.",
      );
    }
  }, []);

  // -------------------------------------------------------------------------
  // Send message
  // -------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading || pendingApproval) return;
      const trimmed = content.trim();

      const userMsgId = `user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: "user",
          content: trimmed,
          createdAt: new Date().toISOString(),
        },
      ]);
      setInput("");
      setIsLoading(true);
      setError(null);
      activityCounter.current = 0;

      if (hermesMode) {
        setActivity([]);
        setShowActivity(true);
      }
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      const streamId = `stream-${Date.now()}`;

      try {
        const res = await fetch(hermesMode ? "/api/agent" : "/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? `Server error ${res.status}`);
        }

        await consumeStream(res, streamId, hermesMode);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        setIsLoading(false);
        setShowActivity(false);
        setActivity([]);
        setMessages((prev) =>
          prev.filter((m) => m.id !== userMsgId && m.id !== streamId),
        );
      } finally {
        setIsLoading(false);
        textareaRef.current?.focus();
      }
    },
    [isLoading, hermesMode, pendingApproval, consumeStream],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void sendMessage(input);
    }
  };
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const isStreaming = messages.some((m) => m.streaming);
  const inputDisabled =
    isLoading || isStreaming || !hasApiKey || pendingApproval !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Mode toggle */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--glass-border)] px-4 py-2">
        <span className="text-xs text-[var(--muted-foreground)]">Mode:</span>
        <button
          onClick={() => {
            setHermesMode(false);
            setPendingApproval(null);
          }}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
            !hermesMode
              ? "bg-[var(--secondary)] text-[var(--foreground)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
          )}
        >
          {!hermesMode ? (
            <ToggleRight className="text-neon size-3.5" />
          ) : (
            <ToggleLeft className="size-3.5" />
          )}
          Chat
        </button>
        <button
          onClick={() => setHermesMode(true)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
            hermesMode
              ? "bg-[var(--primary)]/15 text-[var(--primary)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
          )}
        >
          <Cpu className={cn("size-3.5", hermesMode && "text-neon")} />
          Hermes Agent
          {hermesMode && (
            <Badge variant="default" className="ml-1 py-0 text-[9px]">
              ACTIVE
            </Badge>
          )}
        </button>
        {hermesMode && (
          <p className="ml-auto text-[10px] text-[var(--muted-foreground)]">
            Phase 8: high-risk actions require approval
          </p>
        )}

        {tts.isSupported && (
          <div className={cn("relative", !hermesMode && "ml-auto")}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => tts.setAutoSpeak(!tts.autoSpeak)}
                title={
                  tts.autoSpeak
                    ? "Auto-speak replies: on"
                    : "Auto-speak replies: off"
                }
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors",
                  tts.autoSpeak
                    ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                )}
              >
                {tts.autoSpeak ? (
                  <Volume2 className="size-3.5" />
                ) : (
                  <VolumeX className="size-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowVoiceSettings((v) => !v)}
                title="Voice settings"
                className="rounded-full p-1 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                <Settings2 className="size-3.5" />
              </button>
            </div>

            {showVoiceSettings && (
              <div className="absolute top-8 right-0 z-10 w-64 space-y-3 rounded-lg border border-[var(--glass-border)] bg-[var(--card)] p-3 shadow-lg">
                <div>
                  <label className="mb-1 block text-[10px] text-[var(--muted-foreground)]">
                    Voice
                  </label>
                  <select
                    value={tts.voiceURI ?? ""}
                    onChange={(e) => tts.setVoiceURI(e.target.value || null)}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1 text-xs text-[var(--foreground)] outline-none"
                  >
                    <option value="">Browser default</option>
                    {tts.voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-[10px] text-[var(--muted-foreground)]">
                    <span>Speed</span>
                    <span>{tts.rate.toFixed(1)}×</span>
                  </label>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={tts.rate}
                    onChange={(e) => tts.setRate(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-[10px] text-[var(--muted-foreground)]">
                    <span>Pitch</span>
                    <span>{tts.pitch.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={tts.pitch}
                    onChange={(e) => tts.setPitch(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <p className="text-[9px] text-[var(--muted-foreground)]">
                  Auto-speak reads new JARVIS replies aloud automatically. Uses
                  your browser&apos;s built-in voices — nothing is sent to a
                  server.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl space-y-1 px-4 py-6">
          {messages.length === 0 && !isLoading && !pendingApproval && (
            <EmptyState
              userName={userName}
              hasApiKey={hasApiKey}
              hermesMode={hermesMode}
              onSuggestion={(s) => void sendMessage(s)}
            />
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) =>
              msg.approvalResult ? (
                <ApprovalResultCard
                  key={msg.id}
                  message={msg}
                  executed={msg.approvalResult === "executed"}
                />
              ) : (
                <MessageBubble key={msg.id} message={msg} tts={tts} />
              ),
            )}
          </AnimatePresence>

          {isLoading && !isStreaming && !showActivity && <TypingIndicator />}

          <AnimatePresence>
            {showActivity && activity.length > 0 && (
              <AgentActivityPanel activity={activity} />
            )}
          </AnimatePresence>

          {/* Phase 8: Approval card */}
          <AnimatePresence>
            {pendingApproval && (
              <ApprovalCard
                key={pendingApproval.auditLogId}
                approval={pendingApproval}
                onApprove={handleApprove}
                onReject={handleReject}
                disabled={isLoading}
              />
            )}
          </AnimatePresence>

          {error && (
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          )}
          <div ref={bottomRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="shrink-0 border-t border-[var(--glass-border)] bg-[var(--background)]/80 px-4 py-3 backdrop-blur-md">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              pendingApproval
                ? "Waiting for your approval above…"
                : !hasApiKey
                  ? "Add GOOGLE_AI_API_KEY to .env.local to enable chat"
                  : hermesMode
                    ? "Ask Hermes to take action…  (Ctrl + Enter to send)"
                    : "Ask JARVIS anything…  (Ctrl + Enter to send)"
            }
            disabled={inputDisabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl border border-[var(--glass-border)]",
              "bg-[var(--secondary)]/40 px-4 py-3 text-sm text-[var(--foreground)]",
              "transition-colors outline-none placeholder:text-[var(--muted-foreground)]",
              "focus:border-[var(--primary)]/60 focus:bg-[var(--secondary)]/60",
              "max-h-[200px] overflow-y-auto disabled:cursor-not-allowed disabled:opacity-50",
              hermesMode && !pendingApproval && "border-[var(--primary)]/20",
            )}
          />
          <Button
            type="submit"
            disabled={inputDisabled || !input.trim()}
            size="icon"
            className="mb-0.5 size-11 shrink-0 rounded-xl"
          >
            <Send className="size-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
        <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] text-[var(--muted-foreground)]">
          {pendingApproval
            ? "Input locked — approve or reject the action above to continue"
            : hermesMode
              ? "High-risk actions pause for your approval · All tool calls logged to audit trail"
              : "Responses stream in real time · switch to Hermes for tool use"}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState({
  userName,
  hasApiKey,
  hermesMode,
  onSuggestion,
}: {
  userName: string;
  hasApiKey: boolean;
  hermesMode: boolean;
  onSuggestion: (s: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 py-12 text-center"
    >
      <div className="neon-glow flex size-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10">
        {hermesMode ? (
          <Cpu className="text-neon size-8" />
        ) : (
          <Zap className="text-neon size-8" />
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          {hermesMode ? "Hermes Agent ready." : `Hello, ${userName}.`}
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          {hermesMode
            ? "High-risk actions will pause and ask for your approval."
            : "How can I assist you today?"}
        </p>
      </div>
      {!hasApiKey && (
        <div className="glass-panel flex max-w-sm items-start gap-3 p-4 text-left">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <p className="text-xs text-[var(--muted-foreground)]">
            Add{" "}
            <code className="rounded bg-[var(--muted)] px-1 py-0.5">
              GOOGLE_AI_API_KEY
            </code>{" "}
            to{" "}
            <code className="rounded bg-[var(--muted)] px-1 py-0.5">
              .env.local
            </code>{" "}
            and restart.
          </p>
        </div>
      )}
      {hasApiKey && (
        <div className="flex max-w-lg flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion(s)}
              className={cn(
                "rounded-full border border-[var(--glass-border)] bg-[var(--secondary)]/40 px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/10 hover:text-[var(--foreground)]",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function AgentActivityPanel({ activity }: { activity: ActivityItem[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="my-2 flex items-start gap-3"
    >
      <div className="text-neon neon-glow mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
        <Cpu className="size-3.5" />
      </div>
      <div className="flex-1 space-y-1.5 rounded-2xl rounded-tl-sm border border-[var(--primary)]/15 bg-[var(--secondary)]/40 px-4 py-3">
        <p className="text-[10px] font-semibold tracking-widest text-[var(--primary)] uppercase">
          Hermes · Thinking
        </p>
        {activity.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </div>
    </motion.div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  if (item.kind === "status")
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <span className="size-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
        {item.message}
      </div>
    );
  if (item.kind === "tool_start")
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <Wrench className="size-3 animate-spin text-[var(--primary)]" />
        Running{" "}
        <span className="font-medium text-[var(--foreground)]">
          {item.label}
        </span>
        …
      </div>
    );
  return (
    <div className="flex items-start gap-2 text-xs">
      <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-400" />
      <div>
        <span className="font-medium text-[var(--foreground)]">
          {item.label}
        </span>
        <span className="ml-1 text-[var(--muted-foreground)]">
          — {item.summary}
        </span>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  tts,
}: {
  message: ChatMessage;
  tts: ReturnType<typeof useTextToSpeech>;
}) {
  const isUser = message.role === "user";
  const isSpeaking = tts.speakingId === message.id;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 py-1",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-[var(--secondary)] text-[var(--foreground)]"
            : "text-neon neon-glow bg-[var(--primary)]/10",
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Zap className="size-3.5" />}
      </div>
      <div
        className={cn(
          "group max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-[var(--primary)]/15 text-[var(--foreground)]"
            : "rounded-tl-sm bg-[var(--secondary)]/50 text-[var(--foreground)]",
        )}
      >
        <MessageContent content={message.content} />
        {message.streaming && (
          <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse rounded-full bg-[var(--primary)]" />
        )}
        {!message.streaming && (
          <>
            {message.tools && message.tools.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {message.tools.map((t) => (
                  <span
                    key={t.name}
                    className="flex items-center gap-1 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-1.5 py-0.5 text-[9px] text-[var(--primary)]"
                  >
                    <Wrench className="size-2.5" />
                    {t.label}
                  </span>
                ))}
              </div>
            )}
            <div
              className={cn(
                "mt-1.5 flex items-center gap-1.5",
                isUser ? "flex-row-reverse" : "flex-row",
              )}
            >
              <p className="text-[10px] text-[var(--muted-foreground)]">
                {formatTime(message.createdAt)}
              </p>
              {!isUser && tts.isSupported && message.content.trim() && (
                <button
                  type="button"
                  onClick={() => tts.speak(message.content, message.id)}
                  title={isSpeaking ? "Stop reading aloud" : "Read aloud"}
                  className={cn(
                    "rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100",
                    isSpeaking
                      ? "text-neon opacity-100"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                  )}
                >
                  {isSpeaking ? (
                    <VolumeX className="size-3" />
                  ) : (
                    <Volume2 className="size-3" />
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const inner = part.slice(3, -3);
          const nl = inner.indexOf("\n");
          const code = nl > -1 ? inner.slice(nl + 1) : inner;
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg bg-[var(--muted)] p-3 font-mono text-xs leading-relaxed"
            >
              {code}
            </pre>
          );
        }
        return (
          <span key={i} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      })}
    </div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-start gap-3 py-1"
    >
      <div className="text-neon neon-glow mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
        <Zap className="size-3.5" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-[var(--secondary)]/50 px-4 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-[var(--muted-foreground)]"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--destructive)]" />
      <p className="flex-1 text-[var(--destructive)]">{message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        Dismiss
      </button>
    </motion.div>
  );
}
