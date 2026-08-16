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
import { MASTERED_COOLDOWN_CAP_HOURS } from "@/lib/smart-queue/weights";

const MASTERED_COOLDOWN_CAP_WEEKS = Math.round(MASTERED_COOLDOWN_CAP_HOURS / 24 / 7);

const QUEUE_UP = [
  {
    title: "Never engaged here",
    body: "You haven't read, reviewed, or quizzed it yet in that activity.",
  },
  {
    title: "Missed recently",
    body: "Climbs further the more times in a row you've missed it. A quiz miss also nudges it up in Review, since a miss is trustworthy evidence you don't know it yet.",
  },
  {
    title: "Read a lot, never tested",
    body: "You've opened it several times but never actually tested yourself on it — reading it often isn't the same as learning it.",
  },
  {
    title: "Gone quiet for a while",
    body: "Has history in that activity but hasn't come up in a bit, so it climbs back up instead of being forgotten.",
  },
  {
    title: "Historically tricky",
    body: "Has tripped you up a lot over time, even right after a clean streak wipes today's slate.",
  },
] as const;

const QUEUE_DOWN = [
  {
    title: "Recently mastered",
    body: `Cools down for a while after a pass, longer the more times in a row you've nailed it, up to about ${MASTERED_COOLDOWN_CAP_WEEKS} weeks. One miss resets that.`,
  },
  {
    title: "Touched today",
    body: "Already read, reviewed, or quizzed earlier today — comes back tomorrow instead of right away, so you're not staring at a definition or getting tested on something you just saw.",
  },
] as const;

const SURFACES = [
  {
    title: "Web Read",
    body: "One term at a time from the Read ranking, the same ranking Telegram /read and scheduled delivery use. Opening it counts as a read.",
  },
  {
    title: "Web review",
    body: "Pick a known or unknown pool and work through a ranked batch, marking terms as you go.",
  },
  {
    title: "Web quiz",
    body: "Multiple-choice against your known terms only. A pass never changes the pool; a miss sends the term back to unknown and nudges Review.",
  },
  {
    title: "Web collection",
    body: "Browse and look up terms, sorted however you like in the toolbar, not by the queue. Opening a term counts as a read. Good for reference, not a substitute for review.",
  },
  {
    title: "Telegram bot",
    body: "Same three activities as the web — /read, /review, /quiz — each matching its web counterpart.",
  },
  {
    title: "Desktop widget",
    body: "Terms cycle on your screen, peeked from the same Read ranking as everyone else, but rotating through them doesn't count toward anything. Open one to actually read it.",
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
          title="How the Smart Queue works"
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
            either. Study when you want; the queue picks the best next terms for whichever activity
            you chose, from whichever pool applies to it. See{" "}
            <Link href="/how-terms-work" className={contentPageLinkClass}>
              How terms are built
            </Link>{" "}
            for what known and unknown mean.
          </p>
          <p className="m-0 text-base-content/70">Concretely, that means:</p>
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
      </ContentPageIntro>

      <ContentPageMain>
        <ContentPageSection title="The three activities">
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
            A Quiz pass is guessable, a Review pass isn&apos;t, so a lucky quiz answer
            shouldn&apos;t quiet a term you&apos;ve never actually recalled unprompted. That&apos;s
            why each activity keeps its own history instead of sharing one.
          </p>
        </ContentPageSection>

        <ContentPageSection title="How the Smart Queue ranks">
          <p className="m-0">
            Each activity ranks by its own history: it leans toward what you&apos;ve neglected or
            gotten wrong there, and eases off what you&apos;ve recently nailed. Acing one only cools
            that one down — a Quiz streak doesn&apos;t quiet Review, and vice versa. Cards,
            questions, and the queue preview label each pick with a short reason, like Struggling or
            Not reviewed recently, so it&apos;s never a mystery why a term showed up.
          </p>

          <p className="m-0 font-medium text-base-content">Climbs the queue</p>
          <ContentPageTitledBulletList items={QUEUE_UP} />

          <p className="m-0 font-medium text-base-content">Eases off</p>
          <ContentPageTitledBulletList items={QUEUE_DOWN} />

          <p className="m-0 text-base-content/70">
            Read and Review mix fresh, never-touched terms in with ones you&apos;ve already seen,
            rather than clearing one pile before starting the other. Quiz works through unfamiliar
            terms first, then ones you haven&apos;t quizzed in a while, saving newly mastered ones
            for last.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Strength score">
          <p className="m-0">
            Collection cards also show a strength score — a quick read on how well you actually know
            a term, separate from the queue above. The queue decides what to study next; this is
            where you already stand, and it never feeds back into the ranking.
          </p>
          <p className="m-0">
            It blends how you&apos;ve done in Review and Quiz, weighted toward Review since a review
            pass is stronger evidence than a lucky quiz guess, with a small bump for how much
            you&apos;ve read it. Skip Quiz entirely and that missing history counts against the
            score rather than being ignored, so a Review-only streak can&apos;t look fully proven.
            Go quiet on a term for long enough and the score fades, tested or not — old proof
            matters less than fresh proof. That fade is per term, not per collection, so adding
            more terms doesn&apos;t make an existing one fade faster; the queue just leans harder
            toward whichever ones have gone quiet, same as it always did.
          </p>
          <p className="m-0 text-base-content/70">
            A term you&apos;ve only read, or just marked known, shows as not yet tested rather than
            weak — there&apos;s nothing to judge yet, not a bad result. Zero activity of any kind
            shows as no activity instead. You&apos;ll see the bars on each term, rolled up in your
            stats, and listed out on the Mastery page.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Where you'll see it">
          <p className="m-0">
            Web and Telegram each have Read, Review, and Quiz, and each picks from that
            activity&apos;s ranking. The desktop widget peeks that same Read ranking but
            doesn&apos;t log anything on its own — only collection browsing picks terms its own way,
            outside the queue.
          </p>
          <ContentPageTitledBulletList items={SURFACES} />
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
