import { ListOrdered } from "lucide-react";
import Link from "next/link";
import { JARGON_HOME_PATH, PUBLIC_HOME_PATH } from "@/components/jargon/back-link";
import {
  ContentPageBulletList,
  ContentPageHeader,
  ContentPageIntro,
  ContentPageMain,
  ContentPageSection,
  ContentPageShell,
  ContentPageTitledBulletList,
  contentPageLinkClass,
} from "@/components/content";
import { ENGAGED_MIN_COUNT, SOLID_COOLDOWN_HOURS } from "@/lib/smart-queue";

type HowSmartQueueWorksPageProps = {
  isLoggedIn?: boolean;
};

const SOLID_COOLDOWN_DAYS = Math.round(SOLID_COOLDOWN_HOURS / 24);

const PRIORITY_RAISES = [
  {
    title: "Never read / never tested",
    body: "Rises to the top until every term in the pool has been read (for the Read queue) or tested at least once (for Review or Quiz). Each of the three keeps its own count, so being tested in one doesn't clear this for the other.",
  },
  {
    title: "Struggling",
    body: "You missed it, in review or in a quiz. Climbs the more times you've missed it in a row, so genuinely stuck terms rank above a single slip. Review and Quiz track this independently.",
  },
  {
    title: `Read ${ENGAGED_MIN_COUNT}+ times, not tested`,
    body: "You've opened it on purpose several times but never actually tested yourself, reading it often doesn't mean you've learned it.",
  },
  {
    title: "Left mid-review",
    body: "Revealed in a review session but never rated.",
  },
  {
    title: "Missed elsewhere recently",
    body: "Failing a quiz nudges Read and Review for that term; failing Review nudges Read and Quiz. A miss is trustworthy evidence you don't know it wherever it showed up, but acing one doesn't quiet the others, quizzes are guessable, so a pass there isn't proof the way a miss is.",
  },
  {
    title: "Recently added",
    body: "Terms added in the last few days get a nudge so they don't sink to the bottom.",
  },
  {
    title: "Not tested recently",
    body: "Only applies once you've actually tested yourself on a term, in that same activity. Skip a while after that and it starts climbing again, up to about a week. Terms you've never tested don't get this nudge.",
  },
] as const;

const PRIORITY_LOWERS = [
  {
    title: "Recently mastered",
    body: `Passed recently, in that same activity, sits out for roughly ${SOLID_COOLDOWN_DAYS} days while the queue works on other terms. Acing a quiz doesn't cool down Review, and acing Review doesn't cool down Quiz, they're scored independently.`,
  },
] as const;

const SURFACES = [
  {
    title: "Web review",
    body: "A focused study session. Pick a known or unknown pool, work through a ranked batch, and mark terms as you go. Setup shows a preview; each card shows why it was picked.",
  },
  {
    title: "Web collection",
    body: "Browse and look up terms in your collections, sorted the way you pick in the toolbar, not by the queue's ranking. Opening a term card counts as a read. Good for reference, not a substitute for review.",
  },
  {
    title: "Telegram bot",
    body: "Get terms delivered on a schedule, or pull one on demand with /read. Uses the same Read ranking as the web Read page. Review and quizzes work the same way over Telegram too, each with their own ranking.",
  },
  {
    title: "Desktop widget",
    body: "Terms cycle on your screen on a timer, picked from what's still unknown, not from the queue's ranking. Rotation alone does not count toward anything. Mark known when you're confident, or open the term to read it properly.",
  },
] as const;

export function HowSmartQueueWorksPage({ isLoggedIn = false }: HowSmartQueueWorksPageProps) {
  return (
    <ContentPageShell>
      <ContentPageIntro>
        <ContentPageHeader
          icon={ListOrdered}
          title="How the smart queue works"
          description="I tried spaced repetition for jargon and kept falling off. This is the ranking system I wanted instead, no fixed schedule or future review dates, just what gets neglected or stays shaky."
          backHref={isLoggedIn ? JARGON_HOME_PATH : PUBLIC_HOME_PATH}
          backLabel={isLoggedIn ? "Back to collection" : "Back to home"}
        />

        <p className="m-0 mb-4 text-sm leading-relaxed text-base-content/80">
          This explains how the review ranking works, what the badges mean, and where the queue
          shows up. Useful if you&apos;re curious before signing up, or once you&apos;re in and want
          to understand why certain terms keep surfacing.
        </p>

        <ContentPageSection title="Why not spaced repetition">
          <p className="m-0">
            Anki and similar tools assume you&apos;ll show up every day and trust the interval. That
            works for some material. For jargon, I cared less about when a card was due and more
            about what I&apos;d neglected or still couldn&apos;t use.
          </p>
          <p className="m-0">
            The backlog of &ldquo;due&rdquo; cards didn&apos;t help either. I&apos;d skip a week,
            come back to hundreds of reds, and quit. What I wanted was simpler: open review and see
            what&apos;s neglected or still shaky, in an order that makes sense right now.
          </p>
          <p className="m-0">
            So I built a queue that ranks from history, never read, never tested, missed, or read a
            lot without ever actually testing yourself, not future review dates. No daily goals or
            reminders either. Study when you want; the queue picks the best next terms from
            whichever pool you chose. See{" "}
            <Link href="/how-terms-work" className={contentPageLinkClass}>
              How terms are built
            </Link>{" "}
            for what known and unknown mean.
          </p>
        </ContentPageSection>
      </ContentPageIntro>

      <ContentPageMain>
        <ContentPageSection title="Three separate rankings">
          <p className="m-0">
            Read, Review, and Quiz each keep their own history and their own ranking, they don&apos;t
            share one queue. Review recall (did you actually remember it, self-graded, no
            distractors) and a quiz answer (did you recognize it among a few options) aren&apos;t the
            same kind of evidence, a quiz has a guess floor a review reveal doesn&apos;t, so treating
            them as one signal let a lucky guess quiet a term that still needed real practice. Now
            each activity ranks on its own record, missing in one still nudges the others (see
            below), but acing one only cools that one down.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Surfaces">
          <p className="m-0">
            You can study in different places: focused review in the web app, browse your collection
            when you just need a lookup, message a Telegram bot for one term on demand, or let a
            desktop widget rotate terms in the background. Web review, Telegram, and quizzes each
            pick from their own ranking. Collection browsing and the widget pick terms their own
            way, not from a queue, they just log what you&apos;ve read or tested.
          </p>
          <ContentPageTitledBulletList items={SURFACES} />
        </ContentPageSection>

        <ContentPageSection title="What the queue prioritizes">
          <p className="m-0">
            Each term carries a history per activity: how often you&apos;ve read it, when you last
            tested it, how that test went. The queue uses that to decide what comes next within the
            pool and activity you&apos;re in.
          </p>
          <ContentPageTitledBulletList items={PRIORITY_RAISES} />
          <p className="m-0 text-base-content/70">One signal lowers priority instead:</p>
          <ContentPageTitledBulletList items={PRIORITY_LOWERS} />
          <p className="m-0 text-base-content/70">
            That cooldown is the only scheduled behavior. Nothing else gets a future review date.
          </p>
          <p className="m-0 text-base-content/70">
            Review cards, quiz questions, and the queue preview label terms with these badges. A
            term can have more than one at a time. If none of them apply, it shows{" "}
            <strong className="font-medium text-base-content">Recently reviewed</strong> when
            you&apos;ve actually tested yourself on it recently, or{" "}
            <strong className="font-medium text-base-content">Recently read</strong> when
            you&apos;ve only read it once or twice without testing yourself yet. Nothing&apos;s wrong
            either way, that term just doesn&apos;t stand out yet.
          </p>
          <p className="m-0 text-base-content/70">
            Once you&apos;ve read (or tested) every term in a pool at least once, the never-read
            signal stops applying for that activity. After that, neglected and weak terms rise, a
            gentle cycle with no reset button.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Quizzes">
          <p className="m-0">
            Quizzes rank against their own history, not Review&apos;s, missing on a quiz still nudges
            Read and Review since a miss is trustworthy evidence either way, but a quiz streak only
            cools down future quizzes. Setup shows a preview; questions show badges.
          </p>
        </ContentPageSection>

        <ContentPageSection title="What this is not">
          <p className="m-0 text-base-content/70">
            This ranks what&apos;s in the active pool when I show up. I built it that way on
            purpose, no scheduled future reviews.
          </p>
          <ContentPageBulletList
            items={[
              <>Not Anki, no fixed schedule, intervals, or &ldquo;cards due today&rdquo;</>,
              <>Not a notification system, I study when I want</>,
              <>Not random, every pick comes from my history in that pool and activity</>,
            ]}
          />
        </ContentPageSection>

        {isLoggedIn ? (
          <ContentPageSection title="Next steps">
            <p className="m-0">
              Try{" "}
              <Link href="/jargon/review" className={contentPageLinkClass}>
                review
              </Link>{" "}
              or a{" "}
              <Link href="/jargon/quiz" className={contentPageLinkClass}>
                quiz
              </Link>
              .
            </p>
          </ContentPageSection>
        ) : null}
      </ContentPageMain>
    </ContentPageShell>
  );
}
