import { headers } from "next/headers";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Role string union — mirrors the Prisma `Role` enum exactly.
 *
 * Defined locally here so this file compiles even before `prisma generate`
 * has been run (the generated `@prisma/client` module doesn't exist until
 * then). After generate runs, Prisma's own type will be used everywhere else
 * via the `Role` import in src/lib/auth.ts.
 */
type Role = "ADMIN" | "MANAGER" | "SUPPORT" | "VIEWER";

/**
 * Clerk Webhook Handler  POST /api/webhooks/clerk
 * -------------------------------------------------------------------------
 * Clerk calls this endpoint whenever a user is created, updated, or deleted
 * in your Clerk application. We use it to keep our Postgres `users` table
 * in sync with Clerk's identity store.
 *
 * Security: every request is signed by Clerk using the CLERK_WEBHOOK_SECRET.
 * We verify the signature via the `svix` library before touching the DB —
 * if verification fails we return 400 immediately so forged requests are
 * ignored.
 *
 * Setup (one-time, in the Clerk dashboard):
 *   1. Go to Clerk Dashboard → Webhooks → Add Endpoint
 *   2. URL:  https://your-domain.com/api/webhooks/clerk
 *   3. Subscribe to:  user.created, user.updated, user.deleted
 *   4. Copy the Signing Secret → paste into CLERK_WEBHOOK_SECRET in .env
 *
 * For local development, use the Clerk CLI or ngrok to tunnel localhost.
 */
export async function POST(req: Request) {
  // -------------------------------------------------------------------------
  // 1. Guard: ensure the webhook secret is configured
  // -------------------------------------------------------------------------
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!secret) {
    console.error(
      "[clerk-webhook] CLERK_WEBHOOK_SECRET is not set. " +
        "Webhook events will not be processed.",
    );
    return new Response("Webhook secret not configured.", { status: 500 });
  }

  // -------------------------------------------------------------------------
  // 2. Extract svix signature headers
  // -------------------------------------------------------------------------
  const headerStore = await headers();
  const svixId = headerStore.get("svix-id");
  const svixTimestamp = headerStore.get("svix-timestamp");
  const svixSignature = headerStore.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix signature headers.", { status: 400 });
  }

  // -------------------------------------------------------------------------
  // 3. Verify the signature
  // -------------------------------------------------------------------------
  const payload = await req.text();
  const wh = new Webhook(secret);
  let event: WebhookEvent;

  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("[clerk-webhook] Signature verification failed:", err);
    return new Response("Invalid webhook signature.", { status: 400 });
  }

  // -------------------------------------------------------------------------
  // 4. Handle events
  // -------------------------------------------------------------------------
  const { type, data } = event;
  console.log(`[clerk-webhook] Received event: ${type}`);

  try {
    if (type === "user.created") {
      await handleUserCreated(data);
    } else if (type === "user.updated") {
      await handleUserUpdated(data);
    } else if (type === "user.deleted") {
      await handleUserDeleted(data);
    }
  } catch (err) {
    console.error(`[clerk-webhook] Error handling ${type}:`, err);
    return new Response("Internal error processing webhook.", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

type ClerkUserData = Extract<
  WebhookEvent,
  { type: "user.created" | "user.updated" }
>["data"];

async function handleUserCreated(data: ClerkUserData) {
  const { id, email_addresses, first_name, last_name, public_metadata } = data;

  const email = email_addresses[0]?.email_address;
  if (!email) {
    console.warn(`[clerk-webhook] user.created: no email for clerkId=${id}`);
    return;
  }

  const name = [first_name, last_name].filter(Boolean).join(" ").trim() || null;

  const metaRole = public_metadata?.role as Role | undefined;
  const userCount = await db.user.count();
  const role: Role = metaRole ?? (userCount === 0 ? "ADMIN" : "VIEWER");

  await db.user.upsert({
    where: { clerkId: id },
    update: { email, name },
    create: { clerkId: id, email, name, role },
  });

  console.log(`[clerk-webhook] user.created: ${email} (role: ${role})`);
}

async function handleUserUpdated(data: ClerkUserData) {
  const { id, email_addresses, first_name, last_name, public_metadata } = data;

  const email = email_addresses[0]?.email_address;
  if (!email) return;

  const name = [first_name, last_name].filter(Boolean).join(" ").trim() || null;

  const metaRole = public_metadata?.role as Role | undefined;

  await db.user.upsert({
    where: { clerkId: id },
    update: {
      email,
      name,
      ...(metaRole ? { role: metaRole } : {}),
    },
    create: {
      clerkId: id,
      email,
      name,
      role: metaRole ?? "VIEWER",
    },
  });

  console.log(`[clerk-webhook] user.updated: synced ${email}`);
}

async function handleUserDeleted(
  data: Extract<WebhookEvent, { type: "user.deleted" }>["data"],
) {
  const { id } = data;
  if (!id) return;

  await db.user.deleteMany({ where: { clerkId: id } });
  console.log(`[clerk-webhook] user.deleted: removed clerkId=${id}`);
}
