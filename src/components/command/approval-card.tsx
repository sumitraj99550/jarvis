"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "./command-center";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PendingApproval = {
  auditLogId: string;
  toolName: string;
  toolLabel: string;
  riskLevel: string;
  description: string;
  args: Record<string, unknown>;
};

interface ApprovalCardProps {
  approval: PendingApproval;
  onApprove: (auditLogId: string) => Promise<void>;
  onReject: (auditLogId: string) => Promise<void>;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Risk styling
// ---------------------------------------------------------------------------

type RiskStyle = {
  border: string;
  bg: string;
  badge: "destructive" | "warning" | "default";
  icon: React.ReactNode;
  label: string;
};

function getRiskStyle(level: string): RiskStyle {
  switch (level) {
    case "critical":
      return {
        border: "border-[var(--destructive)]/50",
        bg: "bg-[var(--destructive)]/5",
        badge: "destructive",
        icon: <ShieldAlert className="size-5 text-[var(--destructive)]" />,
        label: "Critical — requires approval",
      };
    case "high":
    default:
      return {
        border: "border-amber-500/40",
        bg: "bg-amber-500/5",
        badge: "warning",
        icon: <ShieldAlert className="size-5 text-amber-400" />,
        label: "High risk — irreversible action",
      };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  disabled = false,
}: ApprovalCardProps) {
  const [isLoading, setIsLoading] = useState<"approve" | "reject" | null>(null);
  const [showArgs, setShowArgs] = useState(false);
  const style = getRiskStyle(approval.riskLevel);

  const hasArgs = Object.keys(approval.args).length > 0;

  const handleApprove = async () => {
    setIsLoading("approve");
    try {
      await onApprove(approval.auditLogId);
    } finally {
      setIsLoading(null);
    }
  };

  const handleReject = async () => {
    setIsLoading("reject");
    try {
      await onReject(approval.auditLogId);
    } finally {
      setIsLoading(null);
    }
  };

  const isBusy = disabled || isLoading !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={cn("my-2 rounded-2xl border p-4", style.border, style.bg)}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{style.icon}</div>

        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Approval Required
            </p>
            <Badge variant={style.badge}>{style.label}</Badge>
          </div>

          <p className="text-xs font-medium text-[var(--muted-foreground)]">
            Action:{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {approval.toolLabel}
            </span>
          </p>
        </div>
      </div>

      {/* What will happen */}
      <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2.5">
        <p className="text-xs leading-relaxed text-[var(--foreground)]">
          {approval.description}
        </p>
      </div>

      {/* Arguments accordion */}
      {hasArgs && (
        <button
          onClick={() => setShowArgs((v) => !v)}
          className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          {showArgs ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
          {showArgs ? "Hide" : "Show"} parameters
        </button>
      )}

      {showArgs && hasArgs && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mt-2 overflow-hidden"
        >
          <pre className="overflow-x-auto rounded-lg bg-[var(--muted)] p-2.5 font-mono text-[10px] leading-relaxed text-[var(--foreground)]">
            {JSON.stringify(approval.args, null, 2)}
          </pre>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex items-center gap-2">
        {/* Approve */}
        <Button
          onClick={handleApprove}
          disabled={isBusy}
          size="sm"
          className="gap-1.5 border border-emerald-500/30 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
          variant="outline"
        >
          {isLoading === "approve" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="size-3.5" />
          )}
          Approve — Execute
        </Button>

        {/* Reject */}
        <Button
          onClick={handleReject}
          disabled={isBusy}
          size="sm"
          variant="outline"
          className="gap-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          {isLoading === "reject" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ShieldX className="size-3.5" />
          )}
          Reject — Cancel
        </Button>

        <p className="ml-auto text-[10px] text-[var(--muted-foreground)]">
          Action logged in audit trail
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Result card — shown after approve/reject resolves
// ---------------------------------------------------------------------------

export function ApprovalResultCard({
  message,
  executed,
}: {
  message: ChatMessage;
  executed: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 py-1"
    >
      <div
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
          executed
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-[var(--muted)] text-[var(--muted-foreground)]",
        )}
      >
        {executed ? (
          <ShieldCheck className="size-3.5" />
        ) : (
          <ShieldX className="size-3.5" />
        )}
      </div>

      <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-[var(--secondary)]/50 px-4 py-2.5 text-sm">
        <p className="text-[var(--foreground)]">{message.content}</p>
        <p className="mt-1.5 text-[10px] text-[var(--muted-foreground)]">
          {executed ? "Executed after approval" : "Cancelled — no action taken"}
        </p>
      </div>
    </motion.div>
  );
}
