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

type SmartQueueGuidePageProps = {
  isLoggedIn?: boolean;
};

const SOLID_COOLDOWN_DAYS = Math.round(SOLID_COOLDOWN_HOURS / 24);

const PRIORITY_SIGNALS = [
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
    body: "You marked it forgot or cleared it as known—ranked above still-learning terms.",
  },
  {
    title: `Seen ${SHOWN_WITHOUT_SOLID_MIN_SEEN}+ times, not solid`,
    body: "Opened without marking it known—seeing it often doesn't mean you've learned it.",
  },
  {
    title: "Recently added",
    body: "Terms added in the last few days get a nudge so they don't sink to the bottom.",
  },
  {
    title: "Not seen recently",
    body: "Skip a day and a term starts climbing again. Wait longer and it climbs higher—up to about a week.",
  },
  {
    title: "Recently marked solid",
    body: `Marked known or answered correctly on a quiz—sits out for roughly ${SOLID_COOLDOWN_DAYS} days while the queue works on other terms.`,
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
    body: "Choose a pool and work through a ranked batch. Setup shows a preview; each card shows why it was picked.",
  },
  {
    title: "Telegram /next and delivery",
    body: "Scheduled messages and /next use the same ranking—one unknown term at a time.",
  },
  {
    title: "Desktop widget",
    body: "Terms rotating on your screen don't count as seen. Tap Next when you want one recorded.",
  },
  {
    title: "Jargon page",
    body: "Opening a term card counts as one sighting for the visit.",
  },
] as const;

export function SmartQueueGuidePage({ isLoggedIn = false }: SmartQueueGuidePageProps) {
  return (
    <ContentPageShell>
      <ContentPageIntro>
        <ContentPageHeader
          icon={ListOrdered}
          title="How the review queue works"
          description="One queue powers review, quizzes, Telegram, and the widget. Terms are ranked from your history—not shuffled, and not scheduled like spaced repetition."
          backHref={isLoggedIn ? JARGON_HOME_PATH : PUBLIC_HOME_PATH}
          backLabel={isLoggedIn ? "Back to collection" : "Back to home"}
        />

        <ContentPageSection title="No daily quotas">
          No daily goals or reminders. Open review or a quiz when you want—the queue ranks terms
          from your active collections and puts the best ones first.
        </ContentPageSection>
      </ContentPageIntro>

      <ContentPageMain>
        <ContentPageSection title="Two pools: known and unknown">
          <p className="m-0">
            Every session starts with a choice: terms you{" "}
            <strong className="font-medium text-base-content">already know</strong>, or terms
            you&apos;re <strong className="font-medium text-base-content">still learning</strong>.
            The two never mix—ranking only happens within the pool you pick.
          </p>
          <p className="m-0">
            Mark a term known or unknown anywhere—in review, a quiz, the list, Telegram, or the
            widget—and it moves between pools.
          </p>
        </ContentPageSection>

        <ContentPageSection title="What the queue prioritizes">
          <p className="m-0">
            Each term has a history: how often you&apos;ve seen it, when you last looked, and how
            you rated it. The queue uses that to decide what comes next.
          </p>
          <ContentPageTitledBulletList items={PRIORITY_SIGNALS} />
          <p className="m-0 text-base-content/70">
            Review cards, quiz questions, and the queue preview label terms with these badges. A
            term can have more than one at a time.
          </p>
          <p className="m-0 text-base-content/70">
            Once you&apos;ve seen every term in a pool at least once, never-seen stops applying.
            After that, neglected and weak terms rise—a gentle cycle with no reset button.
          </p>
        </ContentPageSection>

        <ContentPageSection title="Where you'll see it">
          <p className="m-0">
            Same ranking everywhere. What changes is when something counts as a sighting.
          </p>
          <ContentPageTitledBulletList items={SURFACES} />
        </ContentPageSection>

        <ContentPageSection title="Review style (Settings)">
          <p className="m-0">
            Under <strong className="font-medium text-base-content">Settings → Review</strong>, pick
            a preset that favors new terms or struggling ones. The same preset applies
            everywhere—web review, Telegram{" "}
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
            Same queue and pool rules as review, but struggling terms rank higher—still learning,
            forgot, or seen many times without marking known. Setup shows a preview; questions show
            badges.
          </p>
        </ContentPageSection>

        <ContentPageSection title="What this is not">
          <p className="m-0 text-base-content/70">
            Jargon Gym ranks what&apos;s in your active pool. It doesn&apos;t schedule future
            reviews.
          </p>
          <ContentPageBulletList
            items={[
              <>Not Anki — no due dates, intervals, or &ldquo;cards due today&rdquo;</>,
              <>Not a notification system — you study when you want</>,
              <>Not random — every pick comes from your history in that pool</>,
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
