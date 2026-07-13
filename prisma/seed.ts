import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Local development seed.
 *
 * Creates a single admin user so Phase 3+ pages have a real database row
 * to render. clerkId is intentionally null here — it gets backfilled the
 * first time a real Clerk user signs in via getCurrentDbUser() or the
 * webhook. Safe to run multiple times (uses upsert on email).
 */
async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@jarvis.local" },
    update: {},
    create: {
      email: "admin@jarvis.local",
      name: "JARVIS Admin",
      role: "ADMIN",
      // clerkId is null — this is a seed-only record with no real Clerk identity.
      // When a real user signs in, their own row is created/linked automatically.
    },
  });

  console.log("✓ Seeded admin user:", admin.email, `(role: ${admin.role})`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
