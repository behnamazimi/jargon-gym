import { Compass, Mail } from "lucide-react";
import Link from "next/link";
import { LIBRARY_HOME_PATH, PUBLIC_HOME_PATH } from "@/components/shared/back-link";
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

const AI_FEATURES = [
  {
    title: "Stories",
    body: "A short story written around the terms you're due to read. Pick a style, a language level (A1 to C2), and how much help terms get.",
  },
  {
    title: "AI quizzes",
    body: "Quiz questions written from your terms, definitions, and examples.",
  },
  {
    title: "Listen",
    body: "Terms and stories read aloud. Stories highlight each sentence as it's spoken.",
  },
] as const;

const SURFACES = [
  {
    title: "Web",
    body: "Read (cards and Stories), Review, and Quiz as their own pages, and where you import or browse collections.",
  },
  {
    title: "Telegram bot",
    body: "Same /read, /review, /quiz as the web, plus scheduled delivery for Read if you want terms pushed to you instead of opening the app. Stories and audio are web-only.",
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
          description="A private app for learning the terms of a field or language well enough to use it, not just recognize it. Here's the full picture before you ask for an invite."
          backHref={isLoggedIn ? LIBRARY_HOME_PATH : PUBLIC_HOME_PATH}
          backLabel={isLoggedIn ? "Back to library" : "Back to home"}
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
            Testing is optional though, the rest of the app works fine if you only ever Read.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Where AI comes in">
          <p className="m-0">
            AI is optional and only ever works from your own terms. There are three features:
          </p>
          <ContentPageTitledBulletList items={AI_FEATURES} />
          <p className="m-0">
            Stories and AI quizzes run on free AI credits, or on your own AI API key (Google or
            Anthropic) if you add one. Simple quizzes, Read, and Review never use credits, so the
            app works fine without any of this. Some AI features may be switched off or limited at
            times.
          </p>
          <p className="m-0">
            What leaves the app: AI quizzes send term names, definitions, and examples, and Stories
            send term names, definitions, and any outline you write, to Google or Anthropic. For
            audio, the text being read aloud goes to a speech provider.
          </p>
        </ContentPageSection>

        <ContentPageSection title="What's actually in a term">
          <p className="m-0">
            A term isn&apos;t a flashcard. Alongside the definition there&apos;s room for an
            example, a mental model, in-practice notes, an anti-example, debated angles, and a
            freeform note, added only when they&apos;d actually help, plus links to related terms.
            See{" "}
            <Link href="/how-terms-work" className={contentPageLinkClass}>
              how terms are built
            </Link>{" "}
            for the full structure.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Getting terms in">
          <p className="m-0">
            I use a skill that generates term lists for different fields, more on that once
            you&apos;re in, under More import options. There&apos;s a matching one for language
            vocabulary, words, phrases, or grammar for a language and level. You can also add terms
            one at a time, or skip building anything and browse a shared collection instead.{" "}
            <strong className="font-medium text-base-content">
              Any collection you build can be shared too
            </strong>
            , which puts it in Browse for everyone, not sent to one specific person.
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
            collection, your progress and activity history stays yours, other members never see it.
            The admin sees only basic account details to run the service, as the privacy page
            explains.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Getting in">
          <p className="m-0">
            You don&apos;t need an account to see if the content is any good first. Browse the{" "}
            <Link href="/collections" className={contentPageLinkClass}>
              public collections
            </Link>{" "}
            and read real terms before deciding whether to request access.
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
              <Link href="/app/library" className={contentPageLinkClass}>
                collection
              </Link>
              , or{" "}
              <Link href="/app/import" className={contentPageLinkClass}>
                import a list
              </Link>{" "}
              if you don&apos;t have one yet.
            </p>
          ) : (
            <Alert variant="info" icon={<Mail strokeWidth={1.5} />}>
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
