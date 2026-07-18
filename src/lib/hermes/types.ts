/**
 * Hermes Orchestration Layer — Shared Types
 *
 * These types are used by three consumers:
 *  1. src/lib/hermes/agent.ts  — emits AgentEvents via a callback
 *  2. src/app/api/agent/route.ts — serialises AgentEvents as SSE
 *  3. src/components/command/command-center.tsx — deserialises and renders them
 */

// ---------------------------------------------------------------------------
// SSE event discriminated union
// ---------------------------------------------------------------------------

/** Agent is thinking / routing */
export type StatusEvent = {
  type: "status";
  message: string;
};

/** A tool call has started */
export type ToolStartEvent = {
  type: "tool_start";
  name: string;
  /** Human-readable label, e.g. "Create task" */
  label: string;
};

/** A tool call has completed */
export type ToolDoneEvent = {
  type: "tool_done";
  name: string;
  label: string;
  /** One-line summary of what happened, e.g. "Task created: Write report" */
  summary: string;
};

/** A text chunk from the final response (streaming) */
export type ChunkEvent = {
  type: "chunk";
  content: string;
};

/** Stream is complete — carry DB id + tool run log */
export type DoneEvent = {
  type: "done";
  id: string;
  tools: ToolRecord[];
};

/** An error occurred during the agent run */
export type ErrorEvent = {
  type: "error";
  message: string;
};

export type AgentEvent =
  | StatusEvent
  | ToolStartEvent
  | ToolDoneEvent
  | ChunkEvent
  | DoneEvent
  | ErrorEvent;

// ---------------------------------------------------------------------------
// Tool record — persisted in AuditLog payload
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
