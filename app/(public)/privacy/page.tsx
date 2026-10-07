import type { Metadata } from "next";
import { LegalPage } from "@/components/content/legal-page";
import { legalProse } from "@/components/content/mdx-prose";
import Privacy from "@/content/pages/privacy.mdx";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Lobyas keeps about you, why, and who else handles it.",
};

export default function PrivacyPageRoute() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="What Lobyas keeps about you, why, and who else touches it."
      updated="4 October 2026"
    >
      <Privacy components={legalProse} />
    </LegalPage>
  );
}
