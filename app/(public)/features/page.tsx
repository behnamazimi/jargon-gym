import type { Metadata } from "next";
import { FeaturesPage } from "@/components/features/features-page";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Everything Lobyas does: bringing terms in, learning them with voices, stories and shadowing, and seeing what has stuck.",
};

export default function FeaturesRoute() {
  return <FeaturesPage />;
}
