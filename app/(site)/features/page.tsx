import type { Metadata } from "next";
import { FeaturesPage } from "@/components/features/features-page";

export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Features",
  description:
    "Everything Lobyas does, from getting your terms in to seeing which ones have stuck.",
};

export default function FeaturesRoute() {
  return <FeaturesPage />;
}
