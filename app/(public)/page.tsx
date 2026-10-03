import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: { absolute: "Lobyas: a better way to learn terms and vocabulary" },
  description:
    "Learn the terms of any field or language with real examples, AI stories, AI quizzes, and audio, and keep testing what you're weakest on so they actually stick. Invite-only.",
};

export default function Page() {
  return <LandingPage />;
}
