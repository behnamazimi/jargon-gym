import type { Metadata } from "next";
import { HowSmartQueueWorksPage } from "@/components/content/how-smart-queue-works-page";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "How the smart queue works",
  description:
    "Why I rank terms from history instead of scheduling reviews, surfaces, presets, and how quizzes fit in.",
};

export default async function HowSmartQueueWorksRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <HowSmartQueueWorksPage isLoggedIn={!!user} />;
}
