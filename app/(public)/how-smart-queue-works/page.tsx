import type { Metadata } from "next";
import { HowSmartQueueWorksPage } from "@/components/content/how-smart-queue-works-page";
import { getSessionUser } from "@/lib/auth/require-session";

export const metadata: Metadata = {
  title: "How the Smart Queue works",
  description:
    "Why I rank terms from history instead of scheduling reviews, how Read, Review, and Quiz stay separate, and where the queue shows up.",
};

export default async function HowSmartQueueWorksRoute() {
  const { user } = await getSessionUser();

  return <HowSmartQueueWorksPage isLoggedIn={!!user} />;
}
