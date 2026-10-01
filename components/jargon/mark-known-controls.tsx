"use client";

import { CheckCircle2, CircleCheck, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Term } from "@/lib/jargon/types";
import { SwipeActionLabel } from "./swipe-action";

type MarkKnownButtonProps = {
  markedKnown: boolean;
  onPress: () => void;
};

export function MarkKnownButton({ markedKnown, onPress }: MarkKnownButtonProps) {
  return (
    <Button size="sm" variant={markedKnown ? "outline" : "secondary"} onPress={onPress}>
      {markedKnown ? (
        <>
          <Undo2 className="size-4" aria-hidden strokeWidth={1.5} />
          Mark unknown
        </>
      ) : (
        <>
          <CheckCircle2 className="size-4" aria-hidden strokeWidth={1.5} />
          Mark known
        </>
      )}
    </Button>
  );
}

/** Desktop-only one-click mark on a Library row; phones swipe instead. */
export function QuickMarkKnownButton({ markedKnown, onPress }: MarkKnownButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onPress={onPress}
      aria-label={markedKnown ? "Mark unknown" : "Mark known"}
      className="hidden opacity-0 group-hover:opacity-100 focus-visible:opacity-100 md:inline-flex coarse:hidden"
    >
      {markedKnown ? (
        <Undo2 className="size-4" aria-hidden strokeWidth={1.5} />
      ) : (
        <CircleCheck className="size-4" aria-hidden strokeWidth={1.5} />
      )}
    </Button>
  );
}

/** What a Library row reveals as it's swiped left. */
export function RowSwipeLayer({
  markedKnown,
  ref,
}: {
  markedKnown: boolean;
  ref: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      aria-hidden
      className="absolute inset-0 flex items-center justify-end pe-2 opacity-0"
    >
      <SwipeActionLabel kind={markedKnown ? "markUnknown" : "markKnown"} />
    </div>
  );
}

/** Flips a row's marked-known state and confirms it in a toast with Undo. */
export function useQuickToggleMarkedKnown(
  term: Term,
  markedKnown: boolean,
  onToggleMarkedKnown: (termId: string) => Promise<boolean>,
) {
  const { toast, dismiss } = useToast();

  return function quickToggleMarkedKnown() {
    const saved = onToggleMarkedKnown(term.id);
    const toastId = toast(
      markedKnown ? `Moved "${term.term}" back to learning` : `Marked "${term.term}" known`,
      "success",
      {
        action: {
          label: "Undo",
          // Undo only after the first write lands, or the two could race.
          onPress: () => void saved.then((ok) => ok && onToggleMarkedKnown(term.id)),
        },
      },
    );
    void saved.then((ok) => {
      if (ok) return;
      dismiss(toastId);
      toast(`Couldn't update "${term.term}". Try again.`, "destructive");
    });
  };
}
