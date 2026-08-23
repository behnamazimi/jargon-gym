import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Jargon you can actually use",
  description:
    "I built this for myself after years of picking up jargon I couldn't actually use. Import term lists, mark what you know, review when you feel like it, quiz when you want a check-in. Invite-only.",
};

export default function Page() {
  return <LandingPage />;
}
