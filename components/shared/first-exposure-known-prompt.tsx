"use client";

import { useRef } from "react";
import { setTermMarkedKnownAction } from "@/app/(private)/app/actions";
import { overrideMarkedKnown } from "@/lib/library/overrides";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Shown once, the very first time a term is ever revealed to this user
 *  (term.isNewToUser) — a chance to say "I already know this" before it
 *  enters the Read/Review/Quiz rotation at all. Separate from TRACE's own
 *  earned known label; only ever set by the user, here or on the jargon
 *  page.
 *
 *  Rendered as a button pinned to the bottom-right of the card's scrolling
 *  area, so it stays reachable however long the definition is. Render it
 *  inside that scroll container.
 *
 *  Marking moves straight on to the next term, so the confirmation and its
 *  Undo live in a toast that outlasts this card. */
export function FirstExposureKnownPrompt({
  termId,
  term,
  onMarkedKnown,
}: {
  termId: string;
  term: string;
  onMarkedKnown: () => void;
}) {
  const { toast, dismiss } = useToast();
  const pressedRef = useRef(false);

  function handleUndo(marked: Promise<{ error?: string }>) {
    void (async () => {
      // Undo only after the mark lands, or the two writes could race.
      const markResult = await marked;
      if (markResult.error) return;
      const { error, savedAt } = await setTermMarkedKnownAction(termId, false);
      if (savedAt) overrideMarkedKnown(termId, false, savedAt);
      toast(
        error
          ? `Couldn't undo: "${term}" is still marked known.`
          : "Undone. It'll come back in your queue.",
        error ? "destructive" : "success",
      );
    })();
  }

  function handleMarkKnown() {
    if (pressedRef.current) return;
    pressedRef.current = true;

    const marked = setTermMarkedKnownAction(termId, true);
    onMarkedKnown();
    const toastId = toast(`Marked "${term}" known`, "success", {
      action: { label: "Undo", onPress: () => handleUndo(marked) },
    });

    void marked.then(({ error, savedAt }) => {
      if (savedAt) {
        overrideMarkedKnown(termId, true, savedAt);
        return;
      }
      if (!error) return;
      dismiss(toastId);
      toast("Couldn't mark that term known. It may show up again.", "destructive");
    });
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
        onPress={handleMarkKnown}
      >
        <span className="font-normal text-base-content/70">Already know it?</span>
        <span className="font-medium">Mark as known</span>
      </Button>
    </div>
  );
}
