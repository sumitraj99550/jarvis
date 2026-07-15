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
};

interface CommandCenterProps {
  initialMessages: ChatMessage[];
  userName: string;
  hasApiKey: boolean;
}

// ---------------------------------------------------------------------------
// Suggested starter prompts shown on the empty state
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea as the user types
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
  // Send handler
  // -------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const trimmed = content.trim();

      // 1. Optimistic update — show the user's message immediately
      const optimisticId = `optimistic-${Date.now()}`;
      const userMessage: ChatMessage = {
        id: optimisticId,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setError(null);

      // Reset textarea height
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      try {
        // 2. Call the API
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });

        const data = (await res.json()) as {
          id?: string;
          response?: string;
          createdAt?: string;
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? `Server error ${res.status}`);
        }

        // 3. Append the real assistant message
        const assistantMessage: ChatMessage = {
          id: data.id ?? `assistant-${Date.now()}`,
          role: "assistant",
          content: data.response ?? "",
          createdAt: data.createdAt ?? new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        // Roll back the optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      } finally {
        setIsLoading(false);
        textareaRef.current?.focus();
      }
    },
    [isLoading],
  );

  // -------------------------------------------------------------------------
  // Keyboard handler — Ctrl/Cmd + Enter sends
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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Message list                                                        */}
      {/* ------------------------------------------------------------------ */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="mx-auto max-w-3xl space-y-1 px-4 py-6">
          {/* Empty state */}
          {messages.length === 0 && (
            <EmptyState
              userName={userName}
              hasApiKey={hasApiKey}
              onSuggestion={(s) => void sendMessage(s)}
            />
          )}

          {/* Message bubbles */}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && <TypingIndicator />}

          {/* Error banner */}
          {error && (
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          )}

          {/* Scroll anchor */}
          <div ref={bottomRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* ------------------------------------------------------------------ */}
      {/* Input bar                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="shrink-0 border-t border-[var(--glass-border)] bg-[var(--background)]/80 px-4 py-3 backdrop-blur-md">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <div className="relative flex-1">
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
              disabled={isLoading || !hasApiKey}
              rows={1}
              className={cn(
                "w-full resize-none rounded-xl border border-[var(--glass-border)] bg-[var(--secondary)]/40",
                "px-4 py-3 pr-12 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]",
                "transition-colors outline-none",
                "focus:border-[var(--primary)]/60 focus:bg-[var(--secondary)]/60",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "max-h-[200px] overflow-y-auto",
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !input.trim() || !hasApiKey}
            size="icon"
            className="mb-0.5 size-11 shrink-0 rounded-xl"
          >
            <Send className="size-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>

        <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] text-[var(--muted-foreground)]">
          JARVIS can make mistakes. Phase 6 adds streaming · Phase 7 adds tools
          &amp; memory
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
interface EmptyStateProps {
  userName: string;
  hasApiKey: boolean;
  onSuggestion: (s: string) => void;
}

function EmptyState({ userName, hasApiKey, onSuggestion }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 py-12 text-center"
    >
      {/* JARVIS avatar */}
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
              and restart the dev server to enable the Command Center.
            </p>
          </div>
        </div>
      )}

      {/* Suggestion chips */}
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
            ? "rounded-tr-sm bg-[var(--primary)]/15 text-[var(--foreground)] shadow-[0_0_12px_rgba(61,220,255,0.08)]"
            : "rounded-tl-sm bg-[var(--secondary)]/50 text-[var(--foreground)]",
        )}
      >
        {/* Render content with preserved whitespace and newlines */}
        <MessageContent content={message.content} />

        {/* Timestamp */}
        <p
          className={cn(
            "mt-1.5 text-[10px] text-[var(--muted-foreground)]",
            isUser ? "text-right" : "text-left",
          )}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Message content renderer — handles basic markdown-like formatting
// ---------------------------------------------------------------------------
function MessageContent({ content }: { content: string }) {
  // Split on code blocks (```...```) and render them distinctly
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const inner = part.slice(3, -3);
          // Strip language identifier from first line
          const firstNewline = inner.indexOf("\n");
          const code =
            firstNewline > -1 ? inner.slice(firstNewline + 1) : inner;
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg bg-[var(--muted)] p-3 font-mono text-xs leading-relaxed text-[var(--foreground)]"
            >
              {code}
            </pre>
          );
        }

        // Regular text — preserve newlines
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
// Typing indicator
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
      exit={{ opacity: 0 }}
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
