/**
 * Hermes Orchestration Layer — Shared Types (Phase 8 update)
 *
 * Added:
 *  - ApprovalRequiredEvent  — emitted when a high-risk tool is pending approval
 *  - PendingApprovalData    — payload the route stores in audit_logs
 *  - RiskLevel re-export    — so consumers only need to import from types
 */

export type { RiskLevel } from "./risk";

// ---------------------------------------------------------------------------
// SSE event discriminated union
// ---------------------------------------------------------------------------

export type StatusEvent = {
  type: "status";
  message: string;
};

export type ToolStartEvent = {
  type: "tool_start";
  name: string;
  label: string;
};

export type ToolDoneEvent = {
  type: "tool_done";
  name: string;
  label: string;
  summary: string;
};

export type ChunkEvent = {
  type: "chunk";
  content: string;
};

export type DoneEvent = {
  type: "done";
  id: string;
  tools: ToolRecord[];
};

export type ErrorEvent = {
  type: "error";
  message: string;
};

/**
 * Emitted when the agent detects a high-risk tool call and pauses for
 * human approval. The stream ends after this event (no `done` event).
 * The client must call POST /api/agent/approve to resume or cancel.
 */
export type ApprovalRequiredEvent = {
  type: "approval_required";
  auditLogId: string;
  toolName: string;
  toolLabel: string;
  riskLevel: string;
  description: string;
  args: Record<string, unknown>;
};

export type AgentEvent =
  | StatusEvent
  | ToolStartEvent
  | ToolDoneEvent
  | ChunkEvent
  | DoneEvent
  | ErrorEvent
  | ApprovalRequiredEvent;

// ---------------------------------------------------------------------------
// Tool record — persisted in AuditLog payload and returned in DoneEvent
// ---------------------------------------------------------------------------

export type ToolRecord = {
  name: string;
  label: string;
  summary: string;
};

// ---------------------------------------------------------------------------
// Per-request context passed into every tool executor
// ---------------------------------------------------------------------------

export type ToolContext = {
  userId: string;
};

// ---------------------------------------------------------------------------
// Data stored in audit_logs.payload for pending approvals
// ---------------------------------------------------------------------------

export type PendingApprovalData = {
  toolName: string;
  toolLabel: string;
  args: Record<string, unknown>;
  riskLevel: string;
  description: string;
  userMessage: string;
};
