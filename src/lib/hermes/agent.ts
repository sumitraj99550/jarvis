import {
  GoogleGenerativeAI,
  FunctionCallingMode,
  type Content,
  type Part,
} from "@google/generative-ai";
import { AI_MODEL, type ChatTurn } from "@/lib/ai";
import { TOOL_DECLARATIONS, executeTool } from "./tools";
import type { AgentEvent, ToolRecord, ToolContext } from "./types";

// ---------------------------------------------------------------------------
// Hermes system prompt
// ---------------------------------------------------------------------------
// Separate from the base JARVIS prompt so we can tune the agent's tool-use
// behaviour independently from the conversational chat mode.

const HERMES_SYSTEM_PROMPT = `\
You are JARVIS Hermes, the intelligent orchestration layer of the JARVIS AI \
Operating System. You have access to tools and should use them when the user's \
request would benefit from taking a real action or fetching live data.

Available tools:
- create_task      : Create a task for the user
- get_system_stats : Fetch live JARVIS dashboard metrics
- get_current_time : Get the current date and time
- search_web       : Search the web (Phase 10 stub — inform the user if used)

Guidelines:
- Use tools when they add value; respond directly for simple questions
- After using tools, provide a concise, helpful response based on the results
- Always confirm the action taken when you use a tool
- Be direct and professional — you are an executive AI assistant`;

// ---------------------------------------------------------------------------
// HermesAgent
// ---------------------------------------------------------------------------

export class HermesAgent {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Run the agentic loop for a single user turn.
   *
   * @param message   Current user message
   * @param history   Previous conversation turns (for context)
   * @param ctx       Per-request context (userId, etc.)
   * @param onEvent   Callback fired for each AgentEvent — use this to stream
   *                  status/tool/chunk events to the client in real time
   *
   * @returns { finalText, tools } — the completed response and tool log
   */
  async run(
    message: string,
    history: ChatTurn[],
    ctx: ToolContext,
    onEvent: (event: AgentEvent) => void | Promise<void>,
  ): Promise<{ finalText: string; tools: ToolRecord[] }> {
    const tools: ToolRecord[] = [];

    await onEvent({ type: "status", message: "Analyzing intent…" });

    const model = this.genAI.getGenerativeModel({
      model: AI_MODEL,
      systemInstruction: HERMES_SYSTEM_PROMPT,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      toolConfig: {
        functionCallingConfig: {
          // AUTO: Gemini decides whether to call a function or respond directly
          mode: FunctionCallingMode.AUTO,
        },
      },
    });

    // Convert our flat ChatTurn[] to Gemini's Content[] format
    const geminiHistory: Content[] = history.flatMap((t) => ({
      role: t.role === "assistant" ? "model" : "user",
      parts: [{ text: t.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });

    // -----------------------------------------------------------------
    // Agentic loop
    // -----------------------------------------------------------------
    // Each iteration either:
    //   A) Gets a text response → we're done
    //   B) Gets function calls → execute them, send results, repeat
    //
    // Capped at MAX_ROUNDS to prevent runaway loops.

    const MAX_ROUNDS = 5;
    let currentParts: Part[] = [{ text: message }];
    let finalText = "";

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const result = await chat.sendMessage(currentParts);
      const response = result.response;
      const functionCalls = response.functionCalls();

      // No function calls → Gemini gave us the final text response
      if (!functionCalls || functionCalls.length === 0) {
        finalText = response.text();
        break;
      }

      // Execute each function call sequentially (order matters for context)
      const functionResponses: Part[] = [];

      for (const fc of functionCalls) {
        const label = fc.name
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        await onEvent({ type: "tool_start", name: fc.name, label });

        const { result: toolResult, record } = await executeTool(
          fc.name,
          (fc.args ?? {}) as Record<string, unknown>,
          ctx,
        );

        const toolRecord: ToolRecord = { name: fc.name, ...record };
        tools.push(toolRecord);

        await onEvent({ type: "tool_done", ...toolRecord });

        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: { result: toolResult },
          },
        });
      }

      // Send all tool results back to Gemini for the next round
      currentParts = functionResponses;
    }

    // Fallback if the loop exhausted without producing text
    if (!finalText) {
      finalText =
        "I have completed the requested actions. Let me know if you need anything else.";
    }

    return { finalText, tools };
  }
}
