import { CircleCheck, Clock, Undo2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SwipeActionKind = "knew" | "markKnown" | "notYet" | "markUnknown";

const SWIPE_ACTIONS: Record<SwipeActionKind, { label: string; icon: LucideIcon; tone: string }> = {
  knew: { label: "I knew this", icon: CircleCheck, tone: "bg-success/15 text-success-text" },
  markKnown: { label: "Mark known", icon: CircleCheck, tone: "bg-success/15 text-success-text" },
  notYet: { label: "Not yet", icon: Clock, tone: "bg-warning/15 text-warning-text" },
  markUnknown: { label: "Mark unknown", icon: Undo2, tone: "bg-info/15 text-info-text" },
};

/** Tinted label that fades in behind or over whatever is being swiped, so
 *  a swipe reads the same on the Triage card and on Library rows. */
export function SwipeActionLabel({
  kind,
  className,
  ref,
}: {
  kind: SwipeActionKind;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const { label, icon: Icon, tone } = SWIPE_ACTIONS[kind];
  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none inline-flex items-center gap-2 rounded-field px-3 py-2 text-sm font-semibold",
        tone,
        className,
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.5} />
      {label}
    </div>
  );
}
