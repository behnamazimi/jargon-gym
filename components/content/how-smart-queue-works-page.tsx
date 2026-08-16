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
} from "@/components/content/content-page-shell";
import {
  ENGAGED_MIN_READ_COUNT,
  MASTERED_COOLDOWN_BASE_HOURS,
  MIX_ALREADY_TOUCHED_SLOTS,
  MIX_NEVER_ENGAGED_SLOTS,
  OVERALL_STALENESS_TAU_BASE_HOURS,
  OVERALL_STALENESS_TAU_CAP_HOURS,
} from "@/lib/smart-queue/weights";

const BASE_COOLDOWN_DAYS = Math.round(MASTERED_COOLDOWN_BASE_HOURS / 24);
const STRENGTH_FADE_START_DAYS = Math.round(OVERALL_STALENESS_TAU_BASE_HOURS / 24);
const STRENGTH_FADE_PROVEN_DAYS = Math.round(OVERALL_STALENESS_TAU_CAP_HOURS / 24);

const ANY_ACTIVITY = [
  {
    title: "Never engaged here",
    body: `Never read on Read, never reviewed on Review, never quizzed on Quiz. These take about ${MIX_NEVER_ENGAGED_SLOTS} in every ${MIX_NEVER_ENGAGED_SLOTS + MIX_ALREADY_TOUCHED_SLOTS} picks, mixed in with terms you've already touched, rather than clearing the whole pool first. Being tested in one doesn't clear this for the others.`,
  },
  {
    title: "Missed elsewhere recently",
    body: "Failing a quiz nudges Review — a miss is trustworthy evidence you don't know it, even though quizzes are guessable and a pass isn't proof the way a miss is. This only runs one way: Review misses don't nudge Quiz, since Quiz has its own fixed order (see below) instead of a score mix. A same-day Review miss sits Read out until tomorrow instead of boosting anything; a Quiz miss does not sit Read out.",
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
    title: `Read ${ENGAGED_MIN_READ_COUNT}+ times, not tested`,
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
    body: `Passed recently in that same activity. In Review it sits out while the queue works on other terms; in Quiz it's the last group to appear, not skipped entirely. Starts around ${BASE_COOLDOWN_DAYS} day${BASE_COOLDOWN_DAYS === 1 ? "" : "s"} after a first pass and stretches longer with each pass in a row, up to two weeks. A single miss resets it back to the short end. Acing a quiz doesn't cool down Review, and acing Review doesn't cool down Quiz. Review and Quiz only, Read has nothing to master.`,
  },
  {
    title: "Read today",
    body: "You read the term earlier today (any surface that counts as a read). Review and Quiz sit it out until tomorrow so you aren't tested on a definition you just saw.",
  },
  {
    title: "Missed today",
    body: "You missed it in Review or Quiz earlier today, so the activity you missed in sits that same term out for the rest of the day, a Review miss sits Review out, a Quiz miss sits Quiz out. A same-day Review miss also sits Read out until tomorrow, so you don't reopen the definition right after missing it there; a Quiz miss doesn't, since Quiz only checks terms you've already learned.",
  },
] as const;

const STRENGTH_ITEMS = [
  {
    title: "Review counts more than Quiz",
    body: "A Review pass is stronger evidence than a Quiz pass — Quiz is multiple-choice, so guessing can carry you through it, not through Review. Review pulls more weight in the blend.",
  },
  {
    title: "Untested counts as zero, not skipped",
    body: "Ace Review but never take a Quiz on a term, and the score doesn't pretend Quiz doesn't exist — the missing check counts as zero evidence, not as \"not applicable.\" That's what keeps a Review-only streak from reading as fully proven.",
  },
  {
    title: "Fades if you stop touching it",
    body: `No activity in Read, Review, or Quiz for a while, and the score drifts down. A single old pass starts fading within about ${STRENGTH_FADE_START_DAYS} days; a term you've proven repeatedly can go untouched for around ${STRENGTH_FADE_PROVEN_DAYS} days before it visibly fades — proof should stick around longer than a lucky guess.`,
  },
  {
    title: "Not yet tested is its own thing",
    body: "A term you've only read, or just marked known, shows as not yet tested rather than weak. Weak means you tried and it didn't go well; not yet tested means there's nothing to judge yet.",
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
    body: "Multiple-choice against your known terms only, in the fixed never-quizzed / not-quizzed-recently / recently-mastered order, not Review's mix. Setup shows a preview grouped by that order; questions show badges. A pass never changes the pool; a miss always sends the term back to unknown, sits that Quiz out until tomorrow, and nudges Review — but doesn't sit Read out.",
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
    body: "Terms cycle on your screen, peeked from the same Read ranking as everyone else. Rotating through them alone does not count toward anything. Open a term (or tap Read more) to read it on the Read page.",
  },
] as const;

type HowSmartQueueWorksPageProps = {
  isLoggedIn?: boolean;
};

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
                body: "Recognition among options, and known-terms only, it checks what you've already marked known rather than teaching new ones. There's a guess floor, so a lucky pass shouldn't quiet a term that still needs real recall, and a miss always sends the term back to unknown until you remaster it.",
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
            a future review date. For Read and Review, when both never-engaged and already-touched
            terms exist, picks alternate {MIX_NEVER_ENGAGED_SLOTS} never-engaged to{" "}
            {MIX_ALREADY_TOUCHED_SLOTS} already-touched — about as often as terms you've already
            touched, not always first. A term sitting out a cooldown skips its turn. Once one side
            runs out, the other runs alone: after every term in a pool has been engaged in that
            activity at least once, neglected and weak terms rise on their own, a gentle cycle with
            no reset button.
          </p>
          <p className="m-0 text-base-content/70">
            Quiz doesn&apos;t alternate like that — it fills in a fixed order instead: never quizzed
            first (oldest marked known first), then not quizzed recently, then recently mastered
            last. The setup preview groups terms by these three groups so the order is visible
            before you start.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Strength score">
          <p className="m-0">
            Collection cards also show a strength score — a bar indicator for how well you actually
            know a term. It&apos;s separate from the ranking above: the queue decides what to study
            next, the strength score is a glance at where you already stand. It never feeds back
            into the ranking either way.
          </p>
          <ContentPageTitledBulletList items={STRENGTH_ITEMS} />
          <p className="m-0 text-base-content/70">
            It rolls up Read exposure too, as a small tie-breaker, never enough on its own to move
            the score far. You&apos;ll see the bars next to each term in your collection, totals
            rolled up on the stats page, and every term at once on the Mastery page.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Surfaces">
          <p className="m-0">
            Web and Telegram each have Read, Review, and Quiz, and each picks from that
            activity&apos;s ranking. The desktop widget peeks that same Read ranking but
            doesn&apos;t log anything on its own — only collection browsing picks terms its own way,
            outside the queue.
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
