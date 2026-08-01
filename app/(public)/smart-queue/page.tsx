import type { Metadata } from "next";
import { SmartQueueGuidePage } from "@/components/content/smart-queue-guide-page";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "How the review queue works",
  description:
    "How Jargon Gym picks your next terms — known vs unknown pools, what gets priority, badges, review presets, and where the queue shows up.",
};

export default async function SmartQueueGuideRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SmartQueueGuidePage isLoggedIn={!!user} />;
}
