import type { Metadata } from "next";
import { PrivacyPage } from "@/components/content/privacy-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Lobyas keeps about you, why, and who else handles it.",
};

export default function PrivacyPageRoute() {
  return <PrivacyPage />;
}
