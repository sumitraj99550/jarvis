import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import { db } from "@/lib/db";
import { getBufferService } from "@/lib/buffer";
import { rememberFact, recallMemories } from "@/lib/knowledge/memory";
import { searchDocuments } from "@/lib/knowledge/documents";
import type { ToolContext, ToolRecord } from "./types";

// ---------------------------------------------------------------------------
// Gemini function declarations
// ---------------------------------------------------------------------------
// These are sent to Gemini as part of the model config. Gemini decides
// which (if any) to call based on the user's message.

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "create_task",
    description:
      "Create a new task or to-do item for the user. " +
      "Use when the user asks to create, add, remember, or track a task, " +
      "reminder, or action item.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: "Clear, concise task title",
        },
        priority: {
          type: SchemaType.STRING,
          format: "enum" as const,
          enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
          description: "Task priority — default MEDIUM if not specified",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "get_system_stats",
    description:
      "Retrieve live JARVIS dashboard statistics: " +
      "number of conversations, tasks, and total users. " +
      "Use when the user asks about metrics, stats, usage, or dashboard data.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_current_time",
    description:
      "Return the current date and time. " +
      "Use when the user asks what time or day it is.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        timezone: {
          type: SchemaType.STRING,
          description:
            "IANA timezone string, e.g. 'Asia/Kolkata'. Omit for UTC.",
        },
      },
    },
  },
  {
    name: "search_web",
    description:
      "Search the web for current information, news, or recent events. " +
      "Use when the user needs up-to-date information beyond training data.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "The search query",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "clear_all_tasks",
    description:
      "Permanently delete ALL of the user\'s tasks. " +
      "This action is irreversible and cannot be undone. " +
      "Use only when the user explicitly asks to clear, wipe, or delete all tasks.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "post_social_media",
    description:
      "Schedule or immediately publish a post to a connected social media " +
      "account (Twitter, LinkedIn, Instagram, or Facebook). " +
      "Use when the user asks to post, share, or schedule content to social media. " +
      "Currently runs against a stub provider (Buffer's free tier has no API access) " +
      "— connected profiles are simulated, no real network post is made.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        platform: {
          type: SchemaType.STRING,
          format: "enum" as const,
          enum: ["TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK"],
          description: "Which social platform to post to",
        },
        content: {
          type: SchemaType.STRING,
          description: "The post text/content",
        },
        scheduledFor: {
          type: SchemaType.STRING,
          description:
            "ISO 8601 timestamp to schedule the post for. Omit to publish immediately.",
        },
      },
      required: ["platform", "content"],
    },
  },
  {
    name: "remember_fact",
    description:
      "Save a fact or piece of information to long-term memory, so it can be " +
      "recalled in future, separate conversations. Use when the user says " +
      "something like 'remember that...' or shares a durable preference/fact " +
      "worth keeping (e.g. their timezone, a recurring deadline, a project detail).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: {
          type: SchemaType.STRING,
          description:
            "The fact to remember, written as a standalone statement",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "recall_memory",
    description:
      "Search long-term memory for facts relevant to a query. Use when you " +
      "need context from a previous conversation that isn't in the current " +
      "chat history — e.g. the user references something they told you before.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "What to search memory for",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_knowledge_base",
    description:
      "Semantically search the user's Knowledge Base documents for relevant " +
      "information. Use when the user asks a question that might be answered " +
      "by a document they've saved (e.g. internal docs, notes, reference material).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "What to search the knowledge base for",
        },
      },
      required: ["query"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

type ToolResult = {
  result: unknown;
  record: Omit<ToolRecord, "name">;
};

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  switch (name) {
    // -----------------------------------------------------------------------
    case "create_task": {
      const title = String(args.title ?? "Untitled task");
      const priority =
        (args.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT") ?? "MEDIUM";

      const task = await db.task.create({
        data: { title, priority, userId: ctx.userId, status: "TODO" },
      });

      return {
        result: { id: task.id, title: task.title, priority: task.priority },
        record: {
          label: "Create task",
          summary: `Created: "${title}" (${priority})`,
        },
      };
    }

    // -----------------------------------------------------------------------
    case "get_system_stats": {
      const [conversations, tasks, users] = await Promise.all([
        db.conversation.count({ where: { userId: ctx.userId } }),
        db.task.count({ where: { userId: ctx.userId } }),
        db.user.count(),
      ]);

      return {
        result: { conversations, tasks, totalUsers: users },
        record: {
          label: "Get system stats",
          summary: `${conversations} conversations · ${tasks} tasks · ${users} users`,
        },
      };
    }

    // -----------------------------------------------------------------------
    case "get_current_time": {
      const tz =
        typeof args.timezone === "string" && args.timezone
          ? args.timezone
          : "UTC";

      const now = new Date();
      let formatted: string;
      try {
        formatted = now.toLocaleString("en-US", { timeZone: tz });
      } catch {
        formatted = now.toISOString();
      }

      return {
        result: { utc: now.toISOString(), formatted, timezone: tz },
        record: {
          label: "Get current time",
          summary: `${formatted} (${tz})`,
        },
      };
    }

    // -----------------------------------------------------------------------
    case "search_web": {
      const query = String(args.query ?? "");
      // Real implementation is a future phase — not yet scheduled.
      return {
        result: {
          stub: true,
          query,
          message: "Web search is not yet connected.",
        },
        record: {
          label: "Search web",
          summary: `Web search for "${query}" — stub`,
        },
      };
    }

    // -----------------------------------------------------------------------
    case "clear_all_tasks": {
      const { count } = await db.task.deleteMany({
        where: { userId: ctx.userId },
      });
      return {
        result: { deleted: count },
        record: {
          label: "Clear all tasks",
          summary: `Permanently deleted ${count} task${count !== 1 ? "s" : ""}`,
        },
      };
    }

    // -----------------------------------------------------------------------
    case "post_social_media": {
      const platform = String(
        args.platform ?? "",
      ) as import("@/lib/buffer/types").SocialPlatform;
      const content = String(args.content ?? "");
      const scheduledFor =
        typeof args.scheduledFor === "string" && args.scheduledFor
          ? args.scheduledFor
          : undefined;

      const post = await getBufferService().createPost(ctx.userId, {
        platform,
        content,
        scheduledFor,
      });

      const when =
        post.status === "PUBLISHED"
          ? "published immediately"
          : `scheduled for ${new Date(post.scheduledFor!).toLocaleString()}`;

      return {
        result: { id: post.id, platform, status: post.status },
        record: {
          label: "Post to social media",
          summary: `${platform}: ${when} (mock provider — no real post made)`,
        },
      };
    }

    // -----------------------------------------------------------------------
    case "remember_fact": {
      const content = String(args.content ?? "").trim();
      if (!content) throw new Error("'content' is required.");

      const memory = await rememberFact(ctx.userId, content);

      return {
        result: { id: memory.id },
        record: {
          label: "Remember fact",
          summary: `Saved: "${content.slice(0, 80)}${content.length > 80 ? "…" : ""}"`,
        },
      };
    }

    // -----------------------------------------------------------------------
    case "recall_memory": {
      const query = String(args.query ?? "").trim();
      if (!query) throw new Error("'query' is required.");

      const results = await recallMemories(ctx.userId, query);

      return {
        result: { matches: results },
        record: {
          label: "Recall memory",
          summary:
            results.length > 0
              ? `Found ${results.length} relevant memor${results.length === 1 ? "y" : "ies"}`
              : "No relevant memories found",
        },
      };
    }

    // -----------------------------------------------------------------------
    case "search_knowledge_base": {
      const query = String(args.query ?? "").trim();
      if (!query) throw new Error("'query' is required.");

      const results = await searchDocuments(ctx.userId, query);

      return {
        result: { matches: results },
        record: {
          label: "Search knowledge base",
          summary:
            results.length > 0
              ? `Found ${results.length} relevant document${results.length === 1 ? "" : "s"}`
              : "No relevant documents found",
        },
      };
    }

    // -----------------------------------------------------------------------
    default:
      return {
        result: { error: `Unknown tool: ${name}` },
        record: {
          label: name,
          summary: `Unknown tool: ${name}`,
        },
      };
  }
}
