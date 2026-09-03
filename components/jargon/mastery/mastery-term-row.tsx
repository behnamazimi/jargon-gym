import { Check } from "lucide-react";
import type {
  MasteryTermJourney,
  MasteryTermRow as MasteryTermRowData,
} from "@/lib/jargon/mastery";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { pluralize } from "@/lib/utils";
import { MasteryBars } from "./mastery-bars";

const TIER_LABEL: Record<MasteryTermRowData["tier"], string> = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The mastered-terms "journey" line — a quiet reward moment, tap to see
 *  the first-seen → mastered span behind it. */
function JourneyLine({ journey }: { journey: MasteryTermJourney }) {
  const days = pluralize(journey.learnedInDays, "day");
  return (
    <Collapsible>
      <CollapsibleTrigger className="m-0 mt-0.5 cursor-pointer rounded border-none bg-transparent p-0 text-left text-xs text-success/80 underline decoration-dotted underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-primary">
        Learned in {days}.
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="m-0 mt-0.5 text-xs text-base-content/50">
          First seen {formatShortDate(journey.firstSeenAt)} → mastered{" "}
          {formatShortDate(journey.masteredAt)} ({days})
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MasteryTermRow({ row }: { row: MasteryTermRowData }) {
  return (
    <li className="shadow-surface flex items-center justify-between gap-4 rounded-2xl bg-base-100 px-4 py-3 ring-1 ring-base-content/5">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-heading text-sm font-semibold text-base-content">
            {row.term}
          </span>
          {row.known ? (
            <Check className="size-4 shrink-0 text-success" aria-label="Known" strokeWidth={2.5} />
          ) : null}
        </div>
        <p className="m-0 mt-0.5 truncate text-xs text-base-content/60">
          {row.domainName} · {row.category}
        </p>
        {row.known && row.journey ? <JourneyLine journey={row.journey} /> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <MasteryBars score={row.score} tier={row.tier} />
        <span className="text-xs text-base-content/60 tabular-nums">
          {TIER_LABEL[row.tier]} ({row.score}/100)
        </span>
      </div>
    </li>
  );
}
