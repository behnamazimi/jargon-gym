import { cn } from "@/lib/utils";
import { StudyPeekScene, type Peeker } from "@/components/illustrations/scenes/study-peek";

/** Matches the space between the slot's row and the card, so the lobya lands on the card's edge. */
const EDGE = { 3: "-bottom-3", 4: "-bottom-4" } as const;

/**
 * Takes the free space in a row that sits right above a card and puts the
 * page's lobya on the card's top edge. It stands at the start of the space,
 * so buttons that come and go after it (Skip, Back) don't move it. Only its
 * prop reaches past a narrow space, and only for a moment, so it steps out
 * only when even its body won't fit.
 */
export function StudyPeekSlot({ who, gap = 3 }: { who: Peeker; gap?: keyof typeof EDGE }) {
  return (
    <div className="@container pointer-events-none relative min-w-0 flex-1 self-stretch">
      <StudyPeekScene
        who={who}
        className={cn("absolute left-1 w-18 @max-[3.5rem]:hidden", EDGE[gap])}
      />
    </div>
  );
}
