import type { Metadata } from "next";
import { Mail } from "lucide-react";
import {
  ContentPageHeader,
  ContentPageIntro,
  ContentPageShell,
} from "@/components/content/content-page-shell";
import { PUBLIC_HOME_PATH } from "@/components/shared/back-link";
import { LinkButton } from "@/components/ui/button";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Lobyas with a question, a problem or an idea.",
};

export default function ContactPageRoute() {
  return (
    <ContentPageShell>
      <ContentPageIntro>
        <ContentPageHeader
          icon={Mail}
          title="Contact"
          description="Questions, problems and ideas are all welcome."
          backHref={PUBLIC_HOME_PATH}
          backLabel="Back to home"
        />
      </ContentPageIntro>
      <div className="mt-10 space-y-4 text-sm text-base-content/80">
        <p className="m-0">Email us and a person will read it.</p>
        <LinkButton href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</LinkButton>
        <p className="m-0 text-base-content/70">
          Already have an account? Use Report an issue in your account menu to send a problem or an
          idea with a screenshot.
        </p>
      </div>
    </ContentPageShell>
  );
}
