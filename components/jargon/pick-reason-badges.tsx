import { formatPickReason } from "@/lib/smart-queue/reasons";
import type { PickContext, PickReason } from "@/lib/smart-queue/types";
import { cn } from "@/lib/utils";

type PickReasonBadgesProps = {
  reasons: PickReason[] | undefined;
  /** Which activity these reasons were scored against — some labels (unseen/stale/steady) vary by it. */
  context: PickContext;
  /** Compact: top 1–2 reasons (card/question). Full: all reasons. */
  mode?: "compact" | "full";
  className?: string;
};

const REASON_BADGE_CLASS: Record<PickReason, string> = {
  unseen: "badge-soft badge-primary",
  struggling: "badge-soft badge-warning",
  repeat_fail: "badge-soft badge-error",
  engaged_untested: "badge-soft badge-info",
  abandoned_review: "badge-soft badge-info",
  stale: "badge-soft badge-neutral",
  mastered_cooldown: "badge-ghost",
  recent_read_cooldown: "badge-ghost",
  recent_fail_cooldown: "badge-ghost",
  cross_fail: "badge-soft badge-warning",
  fragile: "badge-soft badge-warning",
  steady: "badge-ghost",
};

export function PickReasonBadges({
  reasons,
  context,
  mode = "compact",
  className,
}: PickReasonBadgesProps) {
  if (!reasons || reasons.length === 0) return null;

  const shown = mode === "compact" ? reasons.slice(0, 2) : reasons;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} aria-label="Why this term was picked">
      {shown.map((reason) => (
        <span key={reason} className={cn("badge badge-sm font-normal", REASON_BADGE_CLASS[reason])}>
          {formatPickReason(reason, context)}
        </span>
      ))}
    </div>
  );
}

export type QueuePreviewItem = {
  id: string;
  term: string;
  pickReasons?: PickReason[];
};

type QueuePreviewProps = {
  items: QueuePreviewItem[];
  context: PickContext;
  loading?: boolean;
  emptyMessage?: string;
};

/** Quiz's hard tiers, derived from the same reasons pickQuizTerms tags
 *  candidates with — mirrors quizTierOf in lib/smart-queue/pick.ts. */
type QuizTierGroup = "Never quizzed" | "Not quizzed recently" | "Recently mastered";

function quizTierGroupOf(item: QueuePreviewItem): QuizTierGroup {
  if (item.pickReasons?.includes("unseen")) return "Never quizzed";
  if (item.pickReasons?.includes("mastered_cooldown")) return "Recently mastered";
  return "Not quizzed recently";
}

const QUIZ_TIER_ORDER: QuizTierGroup[] = [
  "Never quizzed",
  "Not quizzed recently",
  "Recently mastered",
];

function QueuePreviewList({ items, context }: { items: QueuePreviewItem[]; context: PickContext }) {
  return (
    <ul className="m-0 list-none space-y-2.5 p-0">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex flex-col gap-1 border-b border-base-300/60 pb-2.5 last:border-0 last:pb-0"
        >
          <div className="flex items-baseline gap-2">
            <span className="tabular-nums text-xs text-base-content/40">{index + 1}.</span>
            <span className="text-sm font-medium text-base-content">{item.term}</span>
          </div>
          <PickReasonBadges
            reasons={item.pickReasons}
            context={context}
            mode="full"
            className="pl-5"
          />
        </li>
      ))}
    </ul>
  );
}

/** Collapsible setup preview of the next queue batch. Quiz groups by its
 *  three hard tiers; Review/Read stay a flat score-ordered list. */
export function QueuePreview({
  items,
  context,
  loading = false,
  emptyMessage = "No terms match this selection.",
}: QueuePreviewProps) {
  const grouped =
    context === "quiz"
      ? QUIZ_TIER_ORDER.map((tier) => ({
          tier,
          items: items.filter((item) => quizTierGroupOf(item) === tier),
        })).filter((group) => group.items.length > 0)
      : null;

  return (
    <div className="collapse collapse-arrow rounded-lg border border-base-300 bg-base-100">
      <input type="checkbox" defaultChecked={false} aria-label="Toggle queue preview" />
      <div className="collapse-title min-h-0 py-3 text-sm font-medium">
        Queue preview
        {items.length > 0 ? (
          <span className="ml-2 font-normal text-base-content/60">
            ({items.length} term{items.length === 1 ? "" : "s"})
          </span>
        ) : null}
      </div>
      <div className="collapse-content space-y-4 px-4 pb-3">
        {loading ? (
          <p className="m-0 text-sm text-base-content/60">Loading preview…</p>
        ) : items.length === 0 ? (
          <p className="m-0 text-sm text-base-content/60">{emptyMessage}</p>
        ) : grouped ? (
          grouped.map((group) => (
            <div key={group.tier}>
              <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">
                {group.tier}
              </p>
              <QueuePreviewList items={group.items} context={context} />
            </div>
          ))
        ) : (
          <QueuePreviewList items={items} context={context} />
        )}
      </div>
    </div>
  );
}
