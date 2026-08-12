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
import { BASE_COOLDOWN_HOURS, ENGAGED_MIN_COUNT } from "@/lib/smart-queue";

type HowSmartQueueWorksPageProps = {
  isLoggedIn?: boolean;
};

const BASE_COOLDOWN_DAYS = Math.round(BASE_COOLDOWN_HOURS / 24);

const ANY_ACTIVITY = [
  {
    title: "Never engaged here",
    body: "Rises until every term in the pool has been touched in that activity, Never read on Read, Never reviewed on Review, Never quizzed on Quiz. Being tested in one doesn't clear this for the others.",
  },
  {
    title: "Missed elsewhere recently",
    body: "Failing a quiz nudges Review; failing Review nudges Quiz. A miss is trustworthy evidence you don't know it in the other test, but acing one doesn't quiet the others — quizzes are guessable, so a pass there isn't proof the way a miss is. Read sits a same-day miss out instead of boosting it.",
  },
  {
    title: "Recently added",
    body: "Terms added in the last few days get a nudge so they don't sink to the bottom.",
  },
  {
    title: "Not active here recently",
    body: "Once a term has history in that activity, skipping it for a while makes it climb again, up to about a week. Labels match the activity: Not read recently, Not reviewed recently, or Not quizzed recently. Terms with no history there don't get this, they already have Never engaged.",
  },
] as const;

const REVIEW_AND_QUIZ = [
  {
    title: "Struggling",
    body: "You missed it in that activity. Climbs the more times you've missed it in a row, so genuinely stuck terms rank above a single slip. After two misses in a row it also shows as Repeatedly missed. Review and Quiz track this independently, Read has no pass/fail of its own.",
  },
  {
    title: `Read ${ENGAGED_MIN_COUNT}+ times, not tested`,
    body: "You've opened it on purpose several times but never actually tested yourself in this activity, reading it often doesn't mean you've learned it.",
  },
] as const;

const REVIEW_ONLY = [
  {
    title: "Left mid-review",
    body: "Revealed in a review session but never rated.",
  },
] as const;

const PRIORITY_LOWERS = [
  {
    title: "Recently mastered",
    body: `Passed recently in that same activity, sits out while the queue works on other terms. Starts around ${BASE_COOLDOWN_DAYS} day${BASE_COOLDOWN_DAYS === 1 ? "" : "s"} after a first pass and stretches longer with each pass in a row, up to two weeks. A single miss resets it back to the short end. Acing a quiz doesn't cool down Review, and acing Review doesn't cool down Quiz. Review and Quiz only, Read has nothing to master.`,
  },
  {
    title: "Read today — try tomorrow",
    body: "You read the term earlier today (any surface that counts as a read). Review and Quiz sit it out until tomorrow so you aren't tested on a definition you just saw.",
  },
  {
    title: "Missed today — try tomorrow",
    body: "You missed it in Review or Quiz earlier today. Read sits it out until tomorrow so you don't reopen the definition right after a miss. Review and Quiz can still pick it (struggling).",
  },
] as const;

const SURFACES = [
  {
    title: "Web Read",
    body: "One term at a time from the Read ranking, the same ranking Telegram /read and scheduled delivery use. Showing it counts as a read.",
  },
  {
    title: "Web review",
    body: "A focused study session. Pick a known or unknown pool, work through a ranked batch, and mark terms as you go. Setup shows a preview; each card shows why it was picked.",
  },
  {
    title: "Web quiz",
    body: "Multiple-choice against its own Quiz ranking, not Review's. Setup shows a preview; questions show badges. A miss sits Read out until tomorrow (same as Review) and nudges Review; a quiz streak only cools future quizzes.",
  },
  {
    title: "Web collection",
    body: "Browse and look up terms in your collections, sorted the way you pick in the toolbar, not by the queue's ranking. Opening a term card counts as a read. Good for reference, not a substitute for review.",
  },
  {
    title: "Telegram bot",
    body: "Same three activities as the web: /read (and scheduled delivery) from the Read ranking, /review from the Review ranking, /quiz from the Quiz ranking. Each matches its web counterpart.",
  },
  {
    title: "Desktop widget",
    body: "Terms cycle on your screen on a timer, picked from what's still unknown, not from the queue's ranking. Rotation alone does not count toward anything. Open a term (or tap Read more) to read it on the Read page.",
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
          Why I built it this way, how Read, Review, and Quiz stay separate, and where the queue
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
            come back to hundreds of reds, and quit. What I wanted was simpler: open a study surface
            and see what&apos;s neglected or still shaky, in an order that makes sense right now.
          </p>
          <p className="m-0">
            So I built a queue that ranks from history, never engaged, missed, or read a lot without
            ever actually testing yourself, not future review dates. No daily goals or reminders
            either. Study when you want; the queue picks the best next terms from whichever pool and
            activity you chose. See{" "}
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
            Read, Review, and Quiz each keep their own history and their own ranking, they
            don&apos;t share one queue.
          </p>
          <ContentPageTitledBulletList
            items={[
              {
                title: "Read",
                body: "Deliberate exposure without a test, the Read page, Telegram /read, scheduled delivery, or opening a term card. No pass/fail, just whether you've looked at it and how long ago.",
              },
              {
                title: "Review",
                body: "Self-graded recall, you reveal the answer and say whether you had it. No distractors, so a pass is stronger evidence than recognizing an option.",
              },
              {
                title: "Quiz",
                body: "Recognition among options. Useful practice, but there's a guess floor, so a lucky pass shouldn't quiet a term that still needs real recall.",
              },
            ]}
          />
          <p className="m-0">
            Treating Review and Quiz as one signal let a lucky guess cool down a term that had never
            actually been recalled unprompted. Now each activity ranks on its own record. Missing in
            one still nudges the other test; a same-day miss sits Read out until tomorrow. Acing one
            only cools that one down.
          </p>
        </ContentPageSection>

        <ContentPageSection title="What the queue prioritizes">
          <p className="m-0">
            Each term carries a history per activity. The queue uses that to decide what comes next
            within the pool and activity you&apos;re in. Review cards, quiz questions, and the queue
            preview label terms with these badges. A term can have more than one at a time. If none
            of them apply, it shows{" "}
            <strong className="font-medium text-base-content">Recently read</strong>,{" "}
            <strong className="font-medium text-base-content">Recently reviewed</strong>, or{" "}
            <strong className="font-medium text-base-content">Recently quizzed</strong>, you&apos;ve
            engaged with it here and nothing else stands out yet.
          </p>

          <p className="m-0 font-medium text-base-content">Any activity</p>
          <ContentPageTitledBulletList items={ANY_ACTIVITY} />

          <p className="m-0 font-medium text-base-content">Review and Quiz only</p>
          <ContentPageTitledBulletList items={REVIEW_AND_QUIZ} />

          <p className="m-0 font-medium text-base-content">Review only</p>
          <ContentPageTitledBulletList items={REVIEW_ONLY} />

          <p className="m-0 text-base-content/70">These signals lower priority instead:</p>
          <ContentPageTitledBulletList items={PRIORITY_LOWERS} />

          <p className="m-0 text-base-content/70">
            The mastered cooldown (starting around {BASE_COOLDOWN_DAYS} day
            {BASE_COOLDOWN_DAYS === 1 ? "" : "s"} after a pass, growing with each pass in a row) and
            the same-day sit-outs (try tomorrow) are the only time-based quieting. Nothing else gets
            a future review date. Once every term in a pool has been engaged in that activity at
            least once, the never-engaged signal stops applying there. After that, neglected and
            weak terms rise, a gentle cycle with no reset button.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Surfaces">
          <p className="m-0">
            Web and Telegram each have Read, Review, and Quiz, and each picks from that
            activity&apos;s ranking. Collection browsing and the desktop widget pick terms their own
            way, not from a queue — they just log what you&apos;ve read when you open a term.
          </p>
          <ContentPageTitledBulletList items={SURFACES} />
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
              <>
                Not pure random, ranking comes from history; equal scores are shuffled across
                collections
              </>,
            ]}
          />
        </ContentPageSection>

        {isLoggedIn ? (
          <ContentPageSection title="Next steps">
            <p className="m-0">
              Try{" "}
              <Link href="/jargon/read" className={contentPageLinkClass}>
                Read
              </Link>
              ,{" "}
              <Link href="/jargon/review" className={contentPageLinkClass}>
                review
              </Link>
              , or a{" "}
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
