/**
 * Generates a draft support reply using Gemini — the same AI backend
 * Command Center and Hermes already use (Phase 5). No mock/stub needed
 * here: unlike Buffer/RevenueCat/Meta Ads, this doesn't depend on a paid
 * third-party API — it's JARVIS's own already-configured AI engine.
 */

import { sendMessage, type ChatTurn } from "@/lib/ai";
import type { TicketMessageDTO } from "./types";

function threadToTranscript(messages: TicketMessageDTO[]): string {
  return messages
    .map((m) => {
      const speaker =
        m.author === "CUSTOMER"
          ? "Customer"
          : m.author === "AGENT"
            ? "Agent"
            : "AI draft (unsent)";
      return `${speaker}: ${m.content}`;
    })
    .join("\n\n");
}

/**
 * Drafts a reply for a support agent to review/edit before sending. Returns
 * plain text — never sent automatically, always requires an agent to click
 * "Send" (see /api/support/tickets/:id/messages).
 */
export async function generateDraftReply(input: {
  subject: string;
  customer: string;
  priority: string;
  messages: TicketMessageDTO[];
}): Promise<string> {
  const transcript = threadToTranscript(input.messages);

  const prompt = `\
Draft a helpful, professional customer support reply for the ticket below. \
Write only the reply itself — no preamble, no explanation, no subject line, \
just the message text ready to send to the customer.

Ticket subject: ${input.subject}
Customer: ${input.customer}
Priority: ${input.priority}

Conversation so far:
${transcript}

Draft the next reply from the support agent:`;

  const history: ChatTurn[] = [];
  const draft = await sendMessage(prompt, history);
  return draft.trim();
}
