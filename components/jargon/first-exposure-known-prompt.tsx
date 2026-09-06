"use client";

import { useState } from "react";
import { setTermMarkedKnownAction } from "@/app/(private)/jargon/actions";
import { Button } from "@/components/ui/button";

/** Shown once, the very first time a term is ever revealed to this user
 *  (term.isNewToUser) — a chance to say "I already know this" before it
 *  enters the Read/Review/Quiz rotation at all. Separate from TRACE's own
 *  earned known label; only ever set by the user, here or on the jargon
 *  page. */
export function FirstExposureKnownPrompt({ termId }: { termId: string }) {
  const [status, setStatus] = useState<"idle" | "pending" | "marked" | "dismissed">("idle");

  if (status === "dismissed") return null;

  if (status === "marked") {
    return (
      <p className="m-0 text-sm text-base-content/60">
        Marked known — you won&apos;t see this term again unless you add it back to learning.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="m-0 text-sm text-base-content/70">Already know this one?</p>
      <Button
        size="sm"
        variant="outline"
        isDisabled={status === "pending"}
        onPress={async () => {
          setStatus("pending");
          const { error } = await setTermMarkedKnownAction(termId, true);
          setStatus(error ? "idle" : "marked");
        }}
      >
        Mark known
      </Button>
      <Button size="sm" variant="ghost" onPress={() => setStatus("dismissed")}>
        Keep learning
      </Button>
    </div>
  );
}
