"use client";

import { Sparkles } from "lucide-react";
import { useRef } from "react";
import { setTermMarkedKnownAction } from "@/app/(private)/jargon/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Shown once, the very first time a term is ever revealed to this user
 *  (term.isNewToUser) — a chance to say "I already know this" before it
 *  enters the Read/Review/Quiz rotation at all. Separate from TRACE's own
 *  earned known label; only ever set by the user, here or on the jargon
 *  page.
 *
 *  Rendered as a bordered, tinted callout — not inline text — so it reads
 *  as a real secondary action next to Reveal/Next, not something to miss
 *  while skimming the definition.
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
      const { error } = await setTermMarkedKnownAction(termId, false);
      toast(
        error
          ? `Couldn't undo — "${term}" is still marked known.`
          : "Undone — it'll come back in your queue.",
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

    void marked.then(({ error }) => {
      if (!error) return;
      dismiss(toastId);
      toast("Couldn't mark that term known — it may show up again.", "destructive");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex shrink-0 size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-4" aria-hidden strokeWidth={2} />
        </span>
        <div>
          <p className="m-0 text-sm font-semibold text-base-content">Already know it?</p>
          <p className="m-0 text-xs text-base-content/60">
            Mark it known and skip it going forward.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        <Button size="sm" variant="secondary" onPress={handleMarkKnown}>
          Mark known
        </Button>
      </div>
    </div>
  );
}
