import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { CalendarView } from "@/components/calendar/calendar-view";

export const dynamic = "force-dynamic";

const getCachedUser = cache(getCurrentDbUser);

export default async function CalendarPage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">
            Phase 18 — Calendar
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Calendar
          </h2>
        </div>

        <CalendarView />
      </div>
    </div>
  );
}
