import type { Metadata } from "next";
import { showcaseProse } from "@/components/content/mdx-prose";
import { ShowcasePage } from "@/components/content/showcase-page";
import { BeforeYouSignUpScene } from "@/components/illustrations/scenes/before-you-sign-up";
import BeforeYouSignUp from "@/content/pages/before-you-sign-up.mdx";

export const metadata: Metadata = {
  title: "Before you sign up",
  description:
    "What Lobyas actually is, why it's built the way it is, and what to expect before you request an invite.",
};

export default function BeforeYouSignUpRoute() {
  return (
    <ShowcasePage
      title="Before you sign up"
      lead="A private app for learning the terms of a field or language well enough to use them, not just recognize them. Here's the full picture before you ask for an invite."
      scene={<BeforeYouSignUpScene />}
    >
      <BeforeYouSignUp components={showcaseProse} />
    </ShowcasePage>
  );
}
