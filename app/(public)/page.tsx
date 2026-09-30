import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Jargon and vocabulary you can actually use",
  description:
    "Learn a field's jargon or a language's vocabulary with real examples, AI stories, AI quizzes, and audio, and keep testing what you're weakest on so it actually sticks. Invite-only.",
};

export default function Page() {
  return <LandingPage />;
}
