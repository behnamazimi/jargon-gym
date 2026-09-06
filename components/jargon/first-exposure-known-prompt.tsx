"use client";

import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { setTermMarkedKnownAction } from "@/app/(private)/jargon/actions";
import { Button } from "@/components/ui/button";

/** Shown once, the very first time a term is ever revealed to this user
 *  (term.isNewToUser) — a chance to say "I already know this" before it
 *  enters the Read/Review/Quiz rotation at all. Separate from TRACE's own
 *  earned known label; only ever set by the user, here or on the jargon
 *  page.
 *
 *  Rendered as a bordered, tinted callout — not inline text — so it reads
 *  as a real secondary action next to Reveal/Next, not something to miss
 *  while skimming the definition. */
export function FirstExposureKnownPrompt({
  termId,
  onMarkedKnown,
}: {
  termId: string;
  onMarkedKnown?: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "pending" | "marked">("idle");

  if (status === "marked") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
        <span className="inline-flex shrink-0 size-6 items-center justify-center rounded-full bg-success/20 text-success">
          <Check className="size-3.5" aria-hidden strokeWidth={3} />
        </span>
        <p className="m-0 text-sm font-medium text-success">
          Marked known — you won&apos;t see this term again unless you add it back to learning.
        </p>
      </div>
    );
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
        <Button
          size="sm"
          variant="secondary"
          isDisabled={status === "pending"}
          onPress={async () => {
            setStatus("pending");
            const { error } = await setTermMarkedKnownAction(termId, true);
            if (error) {
              setStatus("idle");
              return;
            }
            setStatus("marked");
            onMarkedKnown?.();
          }}
        >
          {status === "pending" ? "Marking…" : "Mark known"}
        </Button>
      </div>
    </div>
  );
}
