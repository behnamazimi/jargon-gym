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
      lead="Learn the terms that stick. A handy app for the terms of a field or the words of a language, until you can use them."
      scene={<AboutScene />}
    >
      <About components={showcaseProse} />
    </ShowcasePage>
  );
}
