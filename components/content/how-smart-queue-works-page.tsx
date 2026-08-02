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
import { SHOWN_WITHOUT_SOLID_MIN_SEEN, SOLID_COOLDOWN_HOURS } from "@/lib/smart-queue";

type HowSmartQueueWorksPageProps = {
  isLoggedIn?: boolean;
};

const SOLID_COOLDOWN_DAYS = Math.round(SOLID_COOLDOWN_HOURS / 24);

const PRIORITY_RAISES = [
  {
    title: "Never seen",
    body: "Rises to the top until you've seen every term in the pool at least once.",
  },
  {
    title: "Still learning",
    body: "You marked it still learning, or got it wrong on a quiz.",
  },
  {
    title: "Forgot",
    body: "You marked it forgot or cleared it as known, ranked above still-learning terms.",
  },
  {
    title: `Seen ${SHOWN_WITHOUT_SOLID_MIN_SEEN}+ times, not solid`,
    body: "Opened without marking it known, seeing it often doesn't mean you've learned it.",
  },
  {
    title: "Recently added",
    body: "Terms added in the last few days get a nudge so they don't sink to the bottom.",
  },
  {
    title: "Not seen recently",
    body: "Skip a day and a term starts climbing again. Wait longer and it climbs higher, up to about a week.",
  },
] as const;

const PRIORITY_LOWERS = [
  {
    title: "Recently marked solid",
    body: `Marked known or answered correctly on a quiz, sits out for roughly ${SOLID_COOLDOWN_DAYS} days while the queue works on other terms.`,
  },
] as const;

const PRESET_OPTIONS = [
  {
    label: "Balanced",
    description: "Default mix of new, struggling, and stale terms.",
  },
  {
    label: "Learn new first",
    description: "Prioritize unseen terms and recently added content.",
  },
  {
    label: "Drill weak spots",
    description: "Focus on terms you're struggling with or forgot.",
  },
] as const;

const SURFACES = [
  {
    title: "Web review",
    body: "A focused study session. Pick a known or unknown pool, work through a ranked batch, and mark terms as you go. Setup shows a preview; each card shows why it was picked. Opening a card counts as one sighting.",
  },
  {
    title: "Web collection",
    body: "Browse and look up terms in your collections. Opening a term card counts as one sighting for that visit. Good for reference, not a substitute for review.",
  },
  {
    title: "Telegram bot",
    body: "Get terms delivered on a schedule, or pull one on demand with /next. Uses the same ranking as web review, one unknown term at a time. Mark known or still learning from inline buttons.",
  },
  {
    title: "Desktop widget",
    body: "Terms rotate on your screen in the background. Rotation alone does not count as a sighting. Tap Next when you want one recorded, or open the term to read it properly.",
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
            So I built a queue that ranks from history, never seen, forgot, seen a lot without
            marking known, not future review dates. No daily goals or reminders either. Study when
            you want; the queue picks the best next terms from whichever pool you chose. See{" "}
            <Link href="/how-terms-work" className={contentPageLinkClass}>
              How terms are built
            </Link>{" "}
            for what known and unknown mean.
          </p>
        </ContentPageSection>
      </ContentPageIntro>

      <ContentPageMain>
        <ContentPageSection title="Surfaces">
          <p className="m-0">
            You can study the same queue in different places: focused review in the web app, browse
            your collection when you just need a lookup, message a Telegram bot for one term on
            demand, or let a desktop widget rotate terms in the background. Same ranking everywhere.
            What changes is when something counts as a sighting.
          </p>
          <ContentPageTitledBulletList items={SURFACES} />
        </ContentPageSection>

        <ContentPageSection title="What the queue prioritizes">
          <p className="m-0">
            Each term carries a history: how often I&apos;ve seen it, when I last looked, how I
            rated it. The queue uses that to decide what comes next within the pool you picked.
          </p>
          <ContentPageTitledBulletList items={PRIORITY_RAISES} />
          <p className="m-0 text-base-content/70">One signal lowers priority instead:</p>
          <ContentPageTitledBulletList items={PRIORITY_LOWERS} />
          <p className="m-0 text-base-content/70">
            That cooldown is the only scheduled behavior. Nothing else gets a future review date.
          </p>
          <p className="m-0 text-base-content/70">
            Review cards, quiz questions, and the queue preview label terms with these badges. A
            term can have more than one at a time.
          </p>
          <p className="m-0 text-base-content/70">
            Once I&apos;ve seen every term in a pool at least once, never-seen stops applying. After
            that, neglected and weak terms rise, a gentle cycle with no reset button.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Review style (Settings)">
          <p className="m-0">
            Once you&apos;re in, you can tune this under{" "}
            <strong className="font-medium text-base-content">Settings → Review</strong>. I added
            presets because sometimes I want to drill weak spots, sometimes to clear never-seen
            terms first. Pick one, the same preset applies everywhere: web review, Telegram{" "}
            <code className="rounded-md bg-base-200 px-1.5 py-0.5 font-mono text-xs">/next</code>,
            quizzes, and delivery.
          </p>
          <ContentPageTitledBulletList
            items={PRESET_OPTIONS.map((preset) => ({
              title: preset.label,
              body: preset.description,
            }))}
          />
          {isLoggedIn ? (
            <p className="m-0">
              <Link href="/jargon/settings" className={contentPageLinkClass}>
                Open review settings
              </Link>
            </p>
          ) : null}
        </ContentPageSection>

        <ContentPageSection title="Quizzes">
          <p className="m-0">
            Quizzes use the same preset and pool rules as review, with one extra tilt I added:
            struggling signals rank higher, still learning, forgot, or seen many times without
            marking known. Setup shows a preview; questions show badges.
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
              <>Not random, every pick comes from my history in that pool</>,
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
              , or adjust your preset in review settings.
            </p>
          </ContentPageSection>
        ) : null}
      </ContentPageMain>
    </ContentPageShell>
  );
}
