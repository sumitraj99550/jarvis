import { GoogleGenerativeAI, type Content } from "@google/generative-ai";

/**
 * Google Gemini AI client.
 *
 * Free tier (no billing required):
 *   Get a key at https://aistudio.google.com/apikey
 *   Set GOOGLE_AI_API_KEY in .env.local
 */

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
// Model — update this one constant to change model everywhere
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
- Be proactive: mention follow-up actions the user should consider
- Speak with confidence and precision, like a trusted executive assistant`;

// ---------------------------------------------------------------------------
// Message type shared by both helpers
// ---------------------------------------------------------------------------
export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

// Gemini uses "model" instead of "assistant" for its role
function toGeminiHistory(turns: ChatTurn[]): Content[] {
  return turns.map((t) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: [{ text: t.content }],
  }));
}

// ---------------------------------------------------------------------------
// Non-streaming helper (kept for tests / server actions that don't need SSE)
// ---------------------------------------------------------------------------
export async function sendMessage(
  message: string,
  history: ChatTurn[],
): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: AI_MODEL,
    systemInstruction: JARVIS_SYSTEM_PROMPT,
  });
  const chat = model.startChat({ history: toGeminiHistory(history) });
  const result = await chat.sendMessage(message);
  const text = result.response.text();
  if (!text) throw new Error("Empty response from Gemini API.");
  return text;
}

// ---------------------------------------------------------------------------
// Streaming helper — Phase 6
// ---------------------------------------------------------------------------
/**
 * Stream a response from Gemini, yielding text chunks as they arrive.
 *
 * Usage in an API route:
 *   for await (const chunk of streamMessage(message, history)) {
 *     // encode and enqueue chunk to the ReadableStream
 *   }
 */
export async function streamMessage(
  message: string,
  history: ChatTurn[],
): Promise<AsyncIterable<string>> {
  const model = getClient().getGenerativeModel({
    model: AI_MODEL,
    systemInstruction: JARVIS_SYSTEM_PROMPT,
  });
  const chat = model.startChat({ history: toGeminiHistory(history) });

  // sendMessageStream returns a GenerateContentStreamResult
  const result = await chat.sendMessageStream(message);

  // Wrap in an async iterable that yields plain text strings
  return {
    [Symbol.asyncIterator]: async function* () {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    },
  };
}
