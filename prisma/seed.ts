import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Local development seed.
 *
 * Creates a single admin user so that Phase 3 (authentication) and beyond
 * have a real row to attach a Clerk identity to, instead of testing against
 * an empty database. Safe to run multiple times — uses `upsert`.
 */
async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@jarvis.local" },
    update: {},
    create: {
      email: "admin@jarvis.local",
      name: "JARVIS Admin",
      role: "ADMIN",
    },
  });

  console.log("Seeded user:", admin);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
