import type { Metadata } from "next";
import { HowSmartQueueWorksPage } from "@/components/content/how-smart-queue-works-page";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "How the smart queue works",
  description:
    "Why I rank terms from history instead of scheduling reviews, how Read, Review, and Quiz stay separate, and where the queue shows up.",
};

export default async function HowSmartQueueWorksRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <HowSmartQueueWorksPage isLoggedIn={!!user} />;
}
