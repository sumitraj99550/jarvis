/**
 * Hermes Tool Risk Classification
 *
 * Risk levels:
 *  low      — Read-only or trivially reversible. Execute immediately.
 *  medium   — Creates data, but the result can be undone. Execute immediately
 *             (a future setting could flip medium → require approval).
 *  high     — Destructive or externally visible. ALWAYS require human approval.
 *  critical — Financial spend, public posting, code deployment.
 *             ALWAYS require human approval (reserved for Phase 10–12 tools).
 *
 * To add a new tool:
 *  1. Add it to TOOL_RISK below.
 *  2. Add a human-readable description to TOOL_APPROVAL_DESCRIPTIONS.
 *  3. That's it — the agent and approval route pick it up automatically.
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";

// ---------------------------------------------------------------------------
// Risk levels per tool name
// ---------------------------------------------------------------------------

export const TOOL_RISK: Record<string, RiskLevel> = {
  // Read-only — safe to run instantly
  get_current_time: "low",
  get_system_stats: "low",
  search_web: "low",
  recall_memory: "low",
  search_knowledge_base: "low",

  // Creates reversible data
  create_task: "medium",
  remember_fact: "medium",

  // Destructive / irreversible — must be approved by the user
  clear_all_tasks: "high",

  // Publishes externally-visible content — critical, always requires approval.
  // Phase 10: runs against a stub Buffer client (no real network post yet).
  post_social_media: "critical",

  // Placeholders for Phase 11–13 (ad spend, email, etc.)
  increase_ad_budget: "critical",
  send_email_blast: "critical",
};

// ---------------------------------------------------------------------------
// What-will-happen descriptions shown on the approval card
// ---------------------------------------------------------------------------

export const TOOL_APPROVAL_DESCRIPTIONS: Record<string, string> = {
  clear_all_tasks:
    "Permanently deletes every task in your task list. " +
    "This cannot be undone — all task data will be lost.",
  post_social_media:
    "Publishes content to your connected social media accounts. " +
    "Once posted it is publicly visible.",
  increase_ad_budget:
    "Increases Meta Ads campaign budget. " +
    "This will result in additional ad spend on your account.",
  send_email_blast:
    "Sends a bulk email to all subscribers. " +
    "Emails cannot be recalled once delivered.",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Risk levels that block execution until the user approves */
const BLOCKED_LEVELS: RiskLevel[] = ["high", "critical"];

export function requiresApproval(toolName: string): boolean {
  return BLOCKED_LEVELS.includes(TOOL_RISK[toolName] ?? "low");
}

export function getRiskLevel(toolName: string): RiskLevel {
  return TOOL_RISK[toolName] ?? "low";
}

/** Human-readable label for a risk level */
export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk — irreversible",
  critical: "Critical — spend / publish",
};
