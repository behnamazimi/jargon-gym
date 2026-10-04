import type { Metadata } from "next";
import { showcaseProse } from "@/components/content/mdx-prose";
import { ShowcasePage } from "@/components/content/showcase-page";
import { AboutScene } from "@/components/illustrations/scenes/about";
import About from "@/content/pages/about.mdx";

export const metadata: Metadata = {
  title: "About",
  description: "Who builds Lobyas and why it exists.",
};

export default function AboutPageRoute() {
  return (
    <ShowcasePage
      title="About Lobyas"
      lead="A small app for learning the terms of a field or language until you can use them."
      scene={<AboutScene />}
    >
      <About components={showcaseProse} />
    </ShowcasePage>
  );
}
