import type { Metadata } from "next";
import { AboutPage } from "@/components/content/about-page";

export const metadata: Metadata = {
  title: "About",
  description: "Who builds Lobyas and why it exists.",
};

export default function AboutPageRoute() {
  return <AboutPage />;
}
