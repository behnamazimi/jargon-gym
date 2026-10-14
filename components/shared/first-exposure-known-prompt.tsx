"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setFirstExposureMarked, useFirstExposureMarked } from "./first-exposure-marks";

/** Shown once, the very first time a term is ever revealed to this user
 *  (term.isNewToUser) — a chance to say "I already know this" before it
 *  enters the Read/Review/Quiz rotation at all. Separate from TRACE's own
 *  earned known label; only ever set by the user, here or on the library
 *  page.
 *
 *  Rendered as a button pinned to the bottom-right of the card's scrolling
 *  area, so it stays reachable however long the definition is. Render it
 *  inside that scroll container.
 *
 *  Marking moves straight on to the next term. There is no toast to undo it:
 *  the term's own card (reached with Previous) now offers "Mark as unknown". */
export function FirstExposureKnownPrompt({
  termId,
  term,
  onMarkedKnown,
}: {
  termId: string;
  term: string;
  onMarkedKnown: () => void;
}) {
  const { toast } = useToast();
  const isMarked = useFirstExposureMarked(termId);

  function handlePress() {
    if (isMarked) {
      setFirstExposureMarked(termId, false, () =>
        toast(`Couldn't move "${term}" back to learning. Try again.`, "destructive"),
      );
      return;
    }
    setFirstExposureMarked(termId, true, () =>
      toast("Couldn't mark that term known. It may show up again.", "destructive"),
    );
    onMarkedKnown();
  }

  return (
    <div
      data-known-prompt
      className="pointer-events-none sticky bottom-0 flex justify-end pt-2 pb-5 sm:pb-6"
    >
      <Button
        size="sm"
        variant="outline"
        className="pointer-events-auto bg-base-100 shadow-none"
        onPress={handlePress}
      >
        {isMarked ? (
          <>
            <span className="font-normal text-base-content/70">Marked known</span>
            <span className="font-medium">Mark as unknown</span>
          </>
        ) : (
          <>
            <span className="font-normal text-base-content/70">Already know it?</span>
            <span className="font-medium">Mark as known</span>
          </>
        )}
      </Button>
    </div>
  );
}
