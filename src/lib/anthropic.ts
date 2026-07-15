import Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic SDK singleton.
 *
 * One instance per Node.js process — avoids re-initialising the HTTP client
 * on every request. The SDK handles connection pooling internally.
 *
 * The API key is read from ANTHROPIC_API_KEY in the environment. If the key
 * is missing the SDK constructor throws at the point of first use (not at
 * import time), which gives a clear error rather than a silent failure.
 *
 * Usage:
 *   import { anthropic, JARVIS_SYSTEM_PROMPT } from "@/lib/anthropic";
 *   const msg = await anthropic.messages.create({ ... });
 */

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

export const anthropic: Anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  globalForAnthropic.anthropic = anthropic;
}

// ---------------------------------------------------------------------------
// JARVIS system prompt
// ---------------------------------------------------------------------------
// Centralised here so every Phase (5, 7, 13 …) that calls Claude uses the
// same identity. Update here to change JARVIS's behaviour everywhere.

export const JARVIS_SYSTEM_PROMPT = `\
You are JARVIS (Just A Rather Very Intelligent System), an advanced AI Operating \
System built for productivity, business intelligence, and intelligent automation.

You assist with:
- Business analytics and performance reporting
- Content creation (social media posts, emails, reports, ad copy)
- Task management and workflow automation planning
- Research and data analysis
- Code review and technical problem-solving
- Answering questions about the JARVIS platform itself

Tone and style:
- Be concise and direct — value the user's time
- Use markdown formatting (bold, bullets, code blocks) where it improves clarity
- When presenting data or lists, use structured formatting
- Be proactive: if you spot follow-up actions the user should consider, mention them
- Speak with confidence and precision, like a trusted executive assistant

The user is interacting through the JARVIS Dashboard. Refer to features by their
module names (Command Center, Voice Assistant, Support Center, etc.) when relevant.`;

// ---------------------------------------------------------------------------
// Model constant — single source of truth across all phases
// ---------------------------------------------------------------------------
export const CLAUDE_MODEL = "claude-sonnet-4-6" as const;
