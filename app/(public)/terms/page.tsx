import type { Metadata } from "next";
import { LegalPage } from "@/components/content/legal-page";
import { legalProse } from "@/components/content/mdx-prose";
import Terms from "@/content/pages/terms.mdx";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The ground rules for using Lobyas.",
};

export default function TermsPageRoute() {
  return (
    <LegalPage
      title="Terms of use"
      description="The ground rules for using Lobyas."
      updated="4 October 2026"
    >
      <Terms components={legalProse} />
    </LegalPage>
  );
}
