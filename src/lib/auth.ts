import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Role string union — mirrors the Prisma `Role` enum exactly.
 *
 * Defined locally so this file compiles before `prisma generate` has been
 * run (the generated `@prisma/client` types don't exist until then). After
 * generate, the real Prisma `Role` type and this local type are structurally
 * identical, so all call sites remain type-safe.
 */
export type Role = "ADMIN" | "MANAGER" | "SUPPORT" | "VIEWER";

/**
 * Numeric rank for each role — lets us do ">=" comparisons so ADMIN can
 * do anything MANAGER can, MANAGER can do anything SUPPORT can, etc.
 */
const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  SUPPORT: 1,
  MANAGER: 2,
  ADMIN: 3,
};

// ---------------------------------------------------------------------------
// User type (subset of Prisma's generated User, safe pre-generate)
// ---------------------------------------------------------------------------

export type DbUser = {
  id: string;
  clerkId: string | null;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

// ---------------------------------------------------------------------------
// Core helper
// ---------------------------------------------------------------------------

/**
 * Returns the authenticated user's database record, creating or updating it
 * if necessary.
 *
 * Flow:
 *  1. Ask Clerk for the active session's userId.
 *  2. Fetch the full Clerk user object (name, email).
 *  3. Look up the database user by clerkId OR email (fallback for rows that
 *     existed before Phase 3).
 *  4. Found: backfill clerkId if missing and return.
 *  5. Not found: create a new user. First user ever → ADMIN, rest → VIEWER.
 *     In production the Clerk webhook handles creation before the user
 *     reaches the app; this is a local-dev / webhook-failure fallback.
 */
export async function getCurrentDbUser(): Promise<DbUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  // Single query: match on clerkId OR email
  const existing = await db.user.findFirst({
    where: { OR: [{ clerkId: userId }, { email }] },
  });

  if (existing) {
    // Backfill clerkId on rows that pre-date Phase 3
    if (!existing.clerkId) {
      return db.user.update({
        where: { id: existing.id },
        data: { clerkId: userId, name: name ?? existing.name },
      }) as Promise<DbUser>;
    }
    return existing as DbUser;
  }

  // Create new user (webhook fallback for local dev)
  const userCount = await db.user.count();
  return db.user.create({
    data: {
      clerkId: userId,
      email,
      name,
      role: userCount === 0 ? "ADMIN" : "VIEWER",
    },
  }) as Promise<DbUser>;
}

// ---------------------------------------------------------------------------
// RBAC helpers
// ---------------------------------------------------------------------------

/**
 * Asserts the currently authenticated user has at least `minimumRole`.
 * Throws an error if unauthenticated or if the role is insufficient.
 *
 * Usage in a Server Action or Route Handler:
 *   const user = await requireRole("MANAGER");
 */
export async function requireRole(minimumRole: Role): Promise<DbUser> {
  const user = await getCurrentDbUser();

  if (!user) {
    throw new Error("Unauthenticated: no active session.");
  }

  if (ROLE_RANK[user.role] < ROLE_RANK[minimumRole]) {
    throw new Error(
      `Forbidden: requires ${minimumRole} but user has ${user.role}.`,
    );
  }

  return user;
}

/**
 * Returns true if the current user has at least `minimumRole`.
 * Never throws — safe to call from Server Components.
 */
export async function hasRole(minimumRole: Role): Promise<boolean> {
  try {
    await requireRole(minimumRole);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the current user's role, or null if unauthenticated.
 */
export async function getCurrentRole(): Promise<Role | null> {
  const user = await getCurrentDbUser();
  return (user?.role as Role) ?? null;
}
