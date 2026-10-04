import {
  ContentPageBulletList,
  ContentPageSection,
  ContentPageTitledBulletList,
  contentPageLinkClass,
} from "@/components/content/content-page-shell";
import { LegalPage } from "@/components/content/legal-page";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/site";

const PROCESSORS = [
  {
    title: "Supabase",
    body: "Database and sign-in. Stores your account and everything you study.",
  },
  { title: "Vercel", body: "Hosts the app." },
  { title: "Resend", body: "Sends sign-up and password emails." },
  {
    title: "Google and Anthropic",
    body: "Write AI quiz questions and Stories. Only when you use those features, and only the terms involved. If you add your own key, requests go on your account with them.",
  },
  {
    title: "Murf and ElevenLabs",
    body: "Turn a term or story into spoken audio. They receive the text to be read aloud.",
  },
  { title: "Telegram", body: "Only if you link the bot. Messages go through Telegram." },
  { title: "Google sign-in", body: "Only if you choose to sign in with Google." },
] as const;

export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      description="What Lobyas keeps about you, why, and who else touches it."
      updated="4 October 2026"
    >
      <ContentPageSection title="Who runs Lobyas">
        <p className="m-0">
          Lobyas is run by Behnam Azimi, an individual based in the Netherlands, who is responsible
          for your data. Questions or requests:{" "}
          <a href={SUPPORT_MAILTO} className={contentPageLinkClass}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </ContentPageSection>

      <ContentPageSection title="What we keep">
        <ContentPageBulletList
          items={[
            "Your email address and sign-in details.",
            "The terms and collections you add, and your study history: what you read, review and quiz, and your streak.",
            "Your settings, including a Telegram link and an AI key if you add one (stored encrypted).",
            "AI credit usage.",
          ]}
        />
        <p className="m-0">
          We use it to run the app and nothing else: no advertising, no selling, no profiling beyond
          the study scheduling you see.
        </p>
      </ContentPageSection>

      <ContentPageSection title="Cookies">
        <p className="m-0">
          Only the essential ones: your login session, your light or dark theme, and your library
          filters. There&apos;s no analytics or tracking, so there&apos;s no cookie banner.
        </p>
      </ContentPageSection>

      <ContentPageSection title="Who else handles it">
        <p className="m-0">These services process data on our behalf:</p>
        <ContentPageTitledBulletList items={PROCESSORS} />
      </ContentPageSection>

      <ContentPageSection title="How long we keep it">
        <p className="m-0">
          For as long as your account exists. Delete your account in Settings and your account and
          its data are removed. If other people use one of your public collections, make it private
          first.
        </p>
      </ContentPageSection>

      <ContentPageSection title="Your rights">
        <p className="m-0">
          Under the GDPR you can ask to see, correct or delete your data, or object to how it&apos;s
          used. Deletion is self-serve in Settings; for anything else, email us and we&apos;ll reply
          within a month. If you&apos;re unhappy with the answer, you can complain to the Dutch Data
          Protection Authority (Autoriteit Persoonsgegevens).
        </p>
      </ContentPageSection>

      <ContentPageSection title="Changes">
        <p className="m-0">
          If this changes in a way that matters, we&apos;ll update the date above and tell signed-in
          people.
        </p>
      </ContentPageSection>
    </LegalPage>
  );
}
