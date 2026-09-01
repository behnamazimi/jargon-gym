import { Compass, Mail } from "lucide-react";
import Link from "next/link";
import { JARGON_HOME_PATH, PUBLIC_HOME_PATH } from "@/components/jargon/back-link";
import {
  ContentPageHeader,
  ContentPageIntro,
  ContentPageMain,
  ContentPageSection,
  ContentPageShell,
  ContentPageTitledBulletList,
  contentPageLinkClass,
} from "@/components/content/content-page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SURFACES = [
  {
    title: "Web",
    body: "Read, Review, and Quiz as their own pages, and where you import or browse collections.",
  },
  {
    title: "Telegram bot",
    body: "Same /read, /review, /quiz as the web, plus scheduled delivery for Read if you want terms pushed to you instead of opening the app.",
  },
  {
    title: "Desktop widget",
    body: "Cycles random terms on your screen in the background. It doesn't log anything on its own, open one to actually read it.",
  },
] as const;

type BeforeYouSignUpPageProps = {
  isLoggedIn?: boolean;
};

export function BeforeYouSignUpPage({ isLoggedIn = false }: BeforeYouSignUpPageProps) {
  return (
    <ContentPageShell>
      <ContentPageIntro>
        <ContentPageHeader
          icon={Compass}
          title="Before you sign up"
          description="A private app for learning jargon well enough to use it, not just recognize it. Here's the full picture before you ask for an invite."
          backHref={isLoggedIn ? JARGON_HOME_PATH : PUBLIC_HOME_PATH}
          backLabel={isLoggedIn ? "Back to collection" : "Back to home"}
        />
      </ContentPageIntro>

      <ContentPageMain>
        <ContentPageSection title="Reading comes first">
          <p className="m-0">
            Most tools like this center on testing, Anki lives and dies by cards due today. I wanted
            something reading-focused instead, closer to my own habit of reading a short article or
            the news than sitting down to study. Read is that: open a term, take it in, move on, no
            pass or fail.
          </p>
          <p className="m-0">
            I read almost every day. I also do at least one Review a day, even if it&apos;s a single
            term, so testing doesn&apos;t disappear, just stays secondary. Quiz comes every few
            days, when I want a harder check, recognizing a term among options is easier than
            recalling it cold, so a Quiz pass alone doesn&apos;t mean I&apos;m done with a term.
            Testing is optional though, the rest of the app works fine if you only ever Read. Quiz
            works out of the box, no setup needed, and gets sharper if you later add your own AI API
            key (Google or Anthropic) so it can write better questions.
          </p>
        </ContentPageSection>

        <ContentPageSection title="What's actually in a term">
          <p className="m-0">
            A term isn&apos;t a flashcard. Alongside the definition there&apos;s room for an
            example, a mental model, in-practice notes, an anti-example, and debated angles, added
            only when they&apos;d actually help, plus links to related terms. See{" "}
            <Link href="/how-terms-work" className={contentPageLinkClass}>
              how terms are built
            </Link>{" "}
            for the full structure.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Getting terms in">
          <p className="m-0">
            I use a skill that generates jargon lists for different fields, more on that once
            you&apos;re in on the import page. You can also add terms one at a time, or skip
            building anything and browse a shared collection instead.{" "}
            <strong className="font-medium text-base-content">
              Any collection you build can be shared with other users too
            </strong>
            , it&apos;s not a one-way street.
          </p>
        </ContentPageSection>

        <ContentPageSection title="No due dates">
          <p className="m-0">
            Instead of a schedule, whatever you&apos;re most at risk of forgetting comes up first,
            so there&apos;s never a backlog waiting for you when you come back.
          </p>
        </ContentPageSection>

        <ContentPageSection title="How it knows what you know">
          <p className="m-0">
            Known isn&apos;t something you manage by hand, it&apos;s read off how well you&apos;ve
            actually retained a term from reading it, recalling it in Review, and recognizing it in
            Quiz, and it fades again if you stop practicing.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Wherever you are">
          <p className="m-0">
            <strong className="font-medium text-base-content">
              Use as many or as few surfaces as you want
            </strong>
            , web, Telegram, and the desktop widget all pull from the same practice history, so
            switching between them doesn&apos;t reset anything.
          </p>
          <ContentPageTitledBulletList items={SURFACES} />
        </ContentPageSection>

        <ContentPageSection title="Private by default">
          <p className="m-0">
            Your own collections are private until you choose to share them. Even on a shared
            collection, your progress and activity history stays yours, nobody else sees it.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Getting in">
          <p className="m-0">
            You don&apos;t need an account to see if the content is any good first. Browse the{" "}
            <Link href="/j" className={contentPageLinkClass}>
              public collections
            </Link>{" "}
            — Agentic Development, Software Engineering, Standup, and more — and read real terms
            before deciding whether to request access.
          </p>
          <p className="m-0">
            It&apos;s invite-only after that, and not an instant code. You{" "}
            <Link href="/request-access" className={contentPageLinkClass}>
              request access
            </Link>
            , an admin approves it, and you get an email with a signup link built in. If you already
            have an account, that same link finishes signing you in instead of starting over.
          </p>
          {isLoggedIn ? (
            <p className="m-0">
              Jump into your{" "}
              <Link href="/jargon" className={contentPageLinkClass}>
                collection
              </Link>
              , or{" "}
              <Link href="/jargon/import" className={contentPageLinkClass}>
                import a list
              </Link>{" "}
              if you don&apos;t have one yet.
            </p>
          ) : (
            <Alert className="alert alert-soft">
              <Mail aria-hidden className="size-10 shrink-0" />
              <AlertDescription>
                <Link href="/request-access" className="underline underline-offset-2">
                  Request access
                </Link>{" "}
                or{" "}
                <Link href="/login" className="underline underline-offset-2">
                  log in
                </Link>{" "}
                with your existing account.
              </AlertDescription>
            </Alert>
          )}
        </ContentPageSection>
      </ContentPageMain>
    </ContentPageShell>
  );
}
