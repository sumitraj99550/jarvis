import {
  GoogleGenerativeAI,
  FunctionCallingMode,
  type Content,
  type Part,
} from "@google/generative-ai";
import { AI_MODEL, type ChatTurn } from "@/lib/ai";
import { TOOL_DECLARATIONS, executeTool } from "./tools";
import {
  requiresApproval,
  getRiskLevel,
  TOOL_APPROVAL_DESCRIPTIONS,
} from "./risk";
import type {
  AgentEvent,
  ToolRecord,
  ToolContext,
  PendingApprovalData,
} from "./types";

// ---------------------------------------------------------------------------
// Hermes system prompt
// ---------------------------------------------------------------------------

const HERMES_SYSTEM_PROMPT = `\
You are JARVIS Hermes, the intelligent orchestration layer of the JARVIS AI \
Operating System. You have access to tools and should use them when the user's \
request would benefit from taking a real action or fetching live data.

Available tools:
- create_task      : Create a task for the user
- get_system_stats : Fetch live JARVIS dashboard metrics
- get_current_time : Get the current date and time
- search_web       : Search the web (Phase 10 stub)
- clear_all_tasks  : ⚠ Permanently delete ALL tasks (requires human approval)

Guidelines:
- Use tools when they add value; respond directly for simple questions
- After using tools, provide a concise, helpful response based on the results
- Always confirm the action taken when you use a tool
- Be direct and professional — you are an executive AI assistant`;

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type AgentResult = {
  finalText: string;
  tools: ToolRecord[];
  /**
   * Set when the agent paused because a high-risk tool needs human approval.
   * The route is responsible for creating the audit_log row and emitting
   * the `approval_required` SSE event.
   */
  pendingApproval?: PendingApprovalData;
};

// ---------------------------------------------------------------------------
// HermesAgent
// ---------------------------------------------------------------------------

export class HermesAgent {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async run(
    message: string,
    history: ChatTurn[],
    ctx: ToolContext,
    onEvent: (event: AgentEvent) => void | Promise<void>,
  ): Promise<AgentResult> {
    const tools: ToolRecord[] = [];

    await onEvent({ type: "status", message: "Analyzing intent…" });

    const model = this.genAI.getGenerativeModel({
      model: AI_MODEL,
      systemInstruction: HERMES_SYSTEM_PROMPT,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      toolConfig: {
        functionCallingConfig: { mode: FunctionCallingMode.AUTO },
      },
    });

    const geminiHistory: Content[] = history.flatMap((t) => ({
      role: t.role === "assistant" ? "model" : "user",
      parts: [{ text: t.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });

    const MAX_ROUNDS = 5;
    let currentParts: Part[] = [{ text: message }];
    let finalText = "";

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const result = await chat.sendMessage(currentParts);
      const response = result.response;
      const functionCalls = response.functionCalls();

      if (!functionCalls || functionCalls.length === 0) {
        finalText = response.text();
        break;
      }

      const functionResponses: Part[] = [];

      for (const fc of functionCalls) {
        const label = fc.name
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        // -------------------------------------------------------------------
        // Phase 8: Risk check — pause before executing high-risk tools
        // -------------------------------------------------------------------
        if (requiresApproval(fc.name)) {
          const riskLevel = getRiskLevel(fc.name);
          const description =
            TOOL_APPROVAL_DESCRIPTIONS[fc.name] ??
            `This action (${label}) requires your approval before proceeding.`;

          // Return a pending-approval signal to the route.
          // The route creates the audit_log row and emits the SSE event.
          return {
            finalText: "",
            tools,
            pendingApproval: {
              toolName: fc.name,
              toolLabel: label,
              args: (fc.args ?? {}) as Record<string, unknown>,
              riskLevel,
              description,
              userMessage: message,
            },
          };
        }

        // -------------------------------------------------------------------
        // Low / medium risk — execute immediately
        // -------------------------------------------------------------------
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

      currentParts = functionResponses;
    }

    if (!finalText) {
      finalText =
        "I have completed the requested actions. Let me know if you need anything else.";
    }

    return { finalText, tools };
  }
}
