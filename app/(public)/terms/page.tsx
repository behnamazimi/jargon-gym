import type { Metadata } from "next";
import { TermsPage } from "@/components/content/terms-page";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The ground rules for using Lobyas.",
};

export default function TermsPageRoute() {
  return <TermsPage />;
}
