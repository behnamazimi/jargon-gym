import type { Metadata } from "next";
import { showcaseProse } from "@/components/content/mdx-prose";
import { ShowcasePage } from "@/components/content/showcase-page";
import { TermAnatomyScene } from "@/components/illustrations/scenes/term-anatomy";
import HowTermsWork from "@/content/pages/how-terms-work.mdx";

export const metadata: Metadata = {
  title: "How terms are built",
  description:
    "Why I split terms from fields and languages into definition, example, mental model, in practice, anti-example, debated, and relationships, what knowing a term means, and how known and unknown work.",
};

export default function HowTermsWorkRoute() {
  return (
    <ShowcasePage
      title="How terms are built"
      lead="I kept learning terms the wrong way, memorizing definitions I couldn't use. This is the shape that came out of that."
      scene={<TermAnatomyScene />}
    >
      <HowTermsWork components={showcaseProse} />
    </ShowcasePage>
  );
}
