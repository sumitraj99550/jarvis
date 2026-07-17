"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Zap, AlertCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  /** true while tokens are still streaming in */
  streaming?: boolean;
};

interface CommandCenterProps {
  initialMessages: ChatMessage[];
  userName: string;
  hasApiKey: boolean;
}

// ---------------------------------------------------------------------------
// Suggested starter prompts
// ---------------------------------------------------------------------------
const SUGGESTIONS = [
  "What can you help me with?",
  "Summarise the JARVIS architecture",
  "Write a LinkedIn post about AI productivity",
  "Draft a weekly status update email",
  "Explain the difference between MRR and ARR",
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

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // -------------------------------------------------------------------------
  // Send — streaming version
  // -------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;
      const trimmed = content.trim();

      // 1. Optimistic user message
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
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      // 2. Streaming assistant message placeholder
      const streamId = `stream-${Date.now()}`;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });

        // Non-2xx before streaming starts → parse JSON error
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? `Server error ${res.status}`);
        }

        if (!res.body) throw new Error("No response body from server.");

        // 3. Add empty streaming message — typing indicator disappears
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
        setIsLoading(false); // hide typing indicator; streaming message visible instead

        // 4. Consume SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(line.slice(6)) as Record<string, unknown>;
            } catch {
              continue; // skip malformed lines
            }

            if (event.error) {
              throw new Error(String(event.error));
            }

            if (!event.done && typeof event.chunk === "string") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamId
                    ? { ...m, content: m.content + event.chunk }
                    : m,
                ),
              );
            }

            if (event.done) {
              // Replace temp id with the real DB id
              const realId = typeof event.id === "string" ? event.id : streamId;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamId
                    ? { ...m, id: realId, streaming: false }
                    : m,
                ),
              );
              break outer;
            }
          }
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        // Roll back both the user message and the streaming placeholder
        setMessages((prev) =>
          prev.filter((m) => m.id !== userMsgId && m.id !== streamId),
        );
        setIsLoading(false);
      } finally {
        setIsLoading(false);
        textareaRef.current?.focus();
      }
    },
    [isLoading],
  );

  // -------------------------------------------------------------------------
  // Keyboard handler
  // -------------------------------------------------------------------------
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

  // Is JARVIS currently streaming a response?
  const isStreaming = messages.some((m) => m.streaming);
  const inputDisabled = isLoading || isStreaming || !hasApiKey;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl space-y-1 px-4 py-6">
          {messages.length === 0 && (
            <EmptyState
              userName={userName}
              hasApiKey={hasApiKey}
              onSuggestion={(s) => void sendMessage(s)}
            />
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {/* Typing indicator — only while waiting for the FIRST chunk */}
          {isLoading && !isStreaming && <TypingIndicator />}

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
              hasApiKey
                ? "Ask JARVIS anything…  (Ctrl + Enter to send)"
                : "Add GOOGLE_AI_API_KEY to .env.local to enable chat"
            }
            disabled={inputDisabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl border border-[var(--glass-border)]",
              "bg-[var(--secondary)]/40 px-4 py-3 text-sm text-[var(--foreground)]",
              "placeholder:text-[var(--muted-foreground)]",
              "transition-colors outline-none",
              "focus:border-[var(--primary)]/60 focus:bg-[var(--secondary)]/60",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "max-h-[200px] overflow-y-auto",
            )}
          />
          <Button
            type="submit"
            disabled={inputDisabled || !input.trim()}
            size="icon"
            className="mb-0.5 size-11 shrink-0 rounded-xl"
          >
            <Send className="size-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>

        <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] text-[var(--muted-foreground)]">
          Responses stream in real time · Phase 7 adds tools &amp; memory
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({
  userName,
  hasApiKey,
  onSuggestion,
}: {
  userName: string;
  hasApiKey: boolean;
  onSuggestion: (s: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 py-12 text-center"
    >
      <div className="neon-glow flex size-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10">
        <Zap className="text-neon size-8" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Hello, {userName}.
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          How can I assist you today?
        </p>
      </div>

      {!hasApiKey && (
        <div className="glass-panel flex max-w-sm items-start gap-3 p-4 text-left">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-400">
              API key not configured
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              Add{" "}
              <code className="rounded bg-[var(--muted)] px-1 py-0.5">
                GOOGLE_AI_API_KEY
              </code>{" "}
              to{" "}
              <code className="rounded bg-[var(--muted)] px-1 py-0.5">
                .env.local
              </code>{" "}
              and restart the dev server.
            </p>
          </div>
        </div>
      )}

      {hasApiKey && (
        <div className="flex max-w-lg flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion(s)}
              className={cn(
                "rounded-full border border-[var(--glass-border)] bg-[var(--secondary)]/40",
                "px-3 py-1.5 text-xs text-[var(--muted-foreground)]",
                "transition-colors hover:border-[var(--primary)]/40",
                "hover:bg-[var(--primary)]/10 hover:text-[var(--foreground)]",
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

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

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
      {/* Avatar */}
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

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-[var(--primary)]/15 text-[var(--foreground)]"
            : "rounded-tl-sm bg-[var(--secondary)]/50 text-[var(--foreground)]",
        )}
      >
        <MessageContent content={message.content} />

        {/* Blinking cursor while streaming */}
        {message.streaming && (
          <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse rounded-full bg-[var(--primary)]" />
        )}

        {/* Timestamp — only when done streaming */}
        {!message.streaming && (
          <p
            className={cn(
              "mt-1.5 text-[10px] text-[var(--muted-foreground)]",
              isUser ? "text-right" : "text-left",
            )}
          >
            {formatTime(message.createdAt)}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Message content renderer
// ---------------------------------------------------------------------------
function MessageContent({ content }: { content: string }) {
  // Split on fenced code blocks (``` ... ```)
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const inner = part.slice(3, -3);
          const newline = inner.indexOf("\n");
          const code = newline > -1 ? inner.slice(newline + 1) : inner;
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

// ---------------------------------------------------------------------------
// Typing indicator (shown while waiting for the first stream chunk)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Error banner
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
