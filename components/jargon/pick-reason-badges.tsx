"use client";

import { formatPickReason, type PickContext, type PickReason } from "@/lib/smart-queue";
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
  new: "badge-soft badge-primary",
  struggling: "badge-soft badge-warning",
  repeat_fail: "badge-soft badge-error",
  engaged_untested: "badge-soft badge-info",
  abandoned_review: "badge-soft badge-info",
  stale: "badge-soft badge-neutral",
  mastered_cooldown: "badge-ghost",
  cross_fail: "badge-soft badge-warning",
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

/** Collapsible setup preview of the next queue batch. */
export function QueuePreview({
  items,
  context,
  loading = false,
  emptyMessage = "No terms match this selection.",
}: QueuePreviewProps) {
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
      <div className="collapse-content px-4 pb-3">
        {loading ? (
          <p className="m-0 text-sm text-base-content/60">Loading preview…</p>
        ) : items.length === 0 ? (
          <p className="m-0 text-sm text-base-content/60">{emptyMessage}</p>
        ) : (
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
        )}
      </div>
    </div>
  );
}
