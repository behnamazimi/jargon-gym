import type { ReviewTerm } from "@/lib/review/types";
import { formatPickDebugLine } from "@/lib/smart-queue/reasons";
import type { PickContext } from "@/lib/smart-queue/types";

export function QueueScoreDebug({ term, context }: { term: ReviewTerm; context: PickContext }) {
  if (term.pickScore === undefined || !term.pickReasons) return null;

  return (
    <p className="m-0 text-xs leading-relaxed text-base-content/40" aria-label="Queue score debug">
      {formatPickDebugLine(term.pickScore, term.pickReasons, context)}
    </p>
  );
}
