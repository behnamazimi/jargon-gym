import {
  ContentPageBulletList,
  ContentPageSection,
  contentPageLinkClass,
} from "@/components/content/content-page-shell";
import { LegalPage } from "@/components/content/legal-page";
import { PRIVACY_PATH, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/site";
import Link from "next/link";

export function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      description="The ground rules for using Lobyas."
      updated="4 October 2026"
    >
      <ContentPageSection title="Who we are">
        <p className="m-0">
          Lobyas is run by Behnam Azimi, an individual in the Netherlands. By using it you agree to
          these terms. If you don&apos;t, please don&apos;t use it.
        </p>
      </ContentPageSection>

      <ContentPageSection title="Your account">
        <ContentPageBulletList
          items={[
            "Lobyas is invite-only. You need an invite or an approved request to sign up.",
            "Keep your sign-in secure. You're responsible for what happens under your account.",
            "One person per account.",
          ]}
        />
      </ContentPageSection>

      <ContentPageSection title="What you add">
        <p className="m-0">
          You keep ownership of the terms and collections you add. You give us permission to store
          and process them to run the app for you. Only add what you have the right to add.
          Don&apos;t upload anything unlawful or that infringes someone else&apos;s rights.
        </p>
      </ContentPageSection>

      <ContentPageSection title="Acceptable use">
        <ContentPageBulletList
          items={[
            "Don't try to break, overload or reach into the service or other people's data.",
            "Don't use AI features to generate unlawful or abusive content.",
            "Don't resell or scrape the service.",
          ]}
        />
      </ContentPageSection>

      <ContentPageSection title="AI features">
        <p className="m-0">
          Quizzes and Stories are written by AI and can be wrong. Check anything that matters. AI
          features may use credits, and limits and prices can change.
        </p>
      </ContentPageSection>

      <ContentPageSection title="The service">
        <p className="m-0">
          Lobyas is provided as is. We try to keep it running and your data safe, but can&apos;t
          promise it is always available or free of errors. To the extent the law allows, we
          aren&apos;t liable for indirect losses. Nothing here limits rights you can&apos;t lose by
          law.
        </p>
      </ContentPageSection>

      <ContentPageSection title="Ending things">
        <p className="m-0">
          You can delete your account any time in Settings. We may suspend or remove accounts that
          break these terms.
        </p>
      </ContentPageSection>

      <ContentPageSection title="Privacy and law">
        <p className="m-0">
          How we handle your data is in the{" "}
          <Link href={PRIVACY_PATH} className={contentPageLinkClass}>
            privacy page
          </Link>
          . Dutch law applies, and disputes go to the courts of the Netherlands, unless the law
          where you live gives you the right to go elsewhere. Questions:{" "}
          <a href={SUPPORT_MAILTO} className={contentPageLinkClass}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </ContentPageSection>
    </LegalPage>
  );
}
