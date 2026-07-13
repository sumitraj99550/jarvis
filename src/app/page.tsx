import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Root route — acts as a smart entry point.
 *
 * Authenticated users land on /dashboard.
 * Unauthenticated users are sent to /sign-in.
 *
 * This keeps the app feeling like an OS: there is no marketing homepage,
 * just the operating system itself. A public landing page can be added
 * later as a separate route group if needed.
 */
export default async function RootPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");
  redirect("/sign-in");
}
