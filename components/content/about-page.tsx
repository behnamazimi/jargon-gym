import { Info } from "lucide-react";
import Link from "next/link";
import {
  ContentPageHeader,
  ContentPageIntro,
  ContentPageMain,
  ContentPageSection,
  ContentPageShell,
  contentPageLinkClass,
} from "@/components/content/content-page-shell";
import { PUBLIC_HOME_PATH } from "@/components/shared/back-link";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/site";

export function AboutPage() {
  return (
    <ContentPageShell>
      <ContentPageIntro>
        <ContentPageHeader
          icon={Info}
          title="About Lobyas"
          description="A small app for learning the terms of a field or language until you can use them."
          backHref={PUBLIC_HOME_PATH}
          backLabel="Back to home"
        />
      </ContentPageIntro>

      <ContentPageMain>
        <ContentPageSection title="Why it exists">
          <p className="m-0">
            Every field has its own vocabulary, and nodding along to words you half know is how
            conversations and interviews go sideways. Lobyas is built around reading terms often and
            testing them lightly, so they stick without feeling like homework.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Who makes it">
          <p className="m-0">
            Lobyas is built and run by Behnam Azimi, one person in the Netherlands. It&apos;s
            invite-only for now so it can stay small and well looked after.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Get in">
          <p className="m-0">
            Read{" "}
            <Link href="/before-you-sign-up" className={contentPageLinkClass}>
              what to expect before you sign up
            </Link>
            , then{" "}
            <Link href="/request-access" className={contentPageLinkClass}>
              request access
            </Link>
            . Questions or feedback:{" "}
            <a href={SUPPORT_MAILTO} className={contentPageLinkClass}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </ContentPageSection>
      </ContentPageMain>
    </ContentPageShell>
  );
}
