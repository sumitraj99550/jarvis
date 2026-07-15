import { GoogleGenerativeAI, type Content } from "@google/generative-ai";

/**
 * Google Gemini AI — free tier, no billing required.
 *
 * Model: gemini-2.0-flash
 *   - Free tier: 15 requests/min · 1,500 requests/day · 1M tokens/min
 *   - No credit card required
 *   - Get your key in 30 seconds: https://aistudio.google.com/apikey
 *
 * Set GOOGLE_AI_API_KEY in .env.local, then restart the dev server.
 */

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

const globalForAI = globalThis as unknown as {
  googleAI: GoogleGenerativeAI | undefined;
};

function getClient(): GoogleGenerativeAI {
  if (globalForAI.googleAI) return globalForAI.googleAI;
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_AI_API_KEY is not set. " +
        "Get a free key at https://aistudio.google.com/apikey " +
        "and add it to .env.local",
    );
  }
  const client = new GoogleGenerativeAI(key);
  if (process.env.NODE_ENV !== "production") globalForAI.googleAI = client;
  return client;
}

// ---------------------------------------------------------------------------
// Model constant — single source of truth
// ---------------------------------------------------------------------------
export const AI_MODEL = "gemini-3.5-flash" as const;

// ---------------------------------------------------------------------------
// JARVIS system prompt
// ---------------------------------------------------------------------------
export const JARVIS_SYSTEM_PROMPT = `\
You are JARVIS (Just A Rather Very Intelligent System), an advanced AI Operating \
System built for productivity, business intelligence, and intelligent automation.

You assist with:
- Business analytics and performance reporting
- Content creation (social media posts, emails, reports, ad copy)
- Task management and workflow automation planning
- Research and data analysis
- Code review and technical problem-solving

Tone and style:
- Be concise and direct — value the user's time
- Use markdown formatting (bold, bullets, code blocks) where it improves clarity
- Be proactive: if you spot follow-up actions the user should consider, mention them
- Speak with confidence and precision, like a trusted executive assistant`;

// ---------------------------------------------------------------------------
// Gemini message format adapter
// ---------------------------------------------------------------------------
// Anthropic uses { role: "user"|"assistant", content: string }
// Gemini uses  { role: "user"|"model",       parts: [{ text }] }

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

function toGeminiHistory(turns: ChatTurn[]): Content[] {
  return turns.map((t) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: [{ text: t.content }],
  }));
}

// ---------------------------------------------------------------------------
// Main helper — called by the chat API route
// ---------------------------------------------------------------------------

/**
 * Send a message to Gemini and return the text response.
 *
 * @param message   The current user message
 * @param history   Previous turns for multi-turn context (oldest first)
 */
export async function sendMessage(
  message: string,
  history: ChatTurn[],
): Promise<string> {
  const client = getClient();

  const model = client.getGenerativeModel({
    model: AI_MODEL,
    systemInstruction: JARVIS_SYSTEM_PROMPT,
  });

  // Gemini's chat API keeps history separate from the current message
  const chat = model.startChat({
    history: toGeminiHistory(history),
  });

  const result = await chat.sendMessage(message);
  const text = result.response.text();

  if (!text) throw new Error("Empty response from Gemini API.");
  return text;
}
