import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Jargon you can actually use",
  description:
    "Every job, industry, and hobby has words insiders throw around without explaining. Jargon Gym teaches you the specific vocabulary for any field, with real examples and a quiz that keeps testing what you're weakest on, so it actually sticks. Invite-only.",
};

export default function Page() {
  return <LandingPage />;
}
