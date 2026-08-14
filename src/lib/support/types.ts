export type TicketStatus = "OPEN" | "PENDING" | "RESOLVED" | "ESCALATED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketMessageAuthor = "CUSTOMER" | "AGENT" | "AI_DRAFT";

export const TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "PENDING",
  "RESOLVED",
  "ESCALATED",
];
export const TICKET_PRIORITIES: TicketPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

export type TicketMessageDTO = {
  id: string;
  author: TicketMessageAuthor;
  content: string;
  createdAt: string;
};

export type TicketDTO = {
  id: string;
  subject: string;
  customer: string;
  customerEmail: string;
  status: TicketStatus;
  priority: TicketPriority;
  resolution: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};
