import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { JsonLd } from "@/components/seo/json-ld";
import { PWA_NAME } from "@/lib/pwa";
import { getPublicBaseUrl } from "@/lib/seo/base-url";
import { website } from "@/lib/seo/json-ld";

const DESCRIPTION =
  "Learn the terms of any field or language with real examples, AI stories, AI quizzes, and audio, and keep testing what you're weakest on so they actually stick. Invite-only.";

export const metadata: Metadata = {
  title: { absolute: "Lobyas: a better way to learn terms and vocabulary" },
  description: DESCRIPTION,
};

export default function Page() {
  return (
    <>
      <JsonLd
        data={website({ name: PWA_NAME, url: getPublicBaseUrl(), description: DESCRIPTION })}
      />
      <LandingPage />
    </>
  );
}
