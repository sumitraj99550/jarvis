import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { VoiceAssistant } from "@/components/voice/voice-assistant";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Voice Assistant | JARVIS",
};

const getCachedUser = cache(getCurrentDbUser);

export default async function VoicePage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const hasApiKey = Boolean(process.env.GOOGLE_AI_API_KEY);

  return (
    <VoiceAssistant
      userName={user.name ?? user.email.split("@")[0]}
      hasApiKey={hasApiKey}
    />
  );
}
