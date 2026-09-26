"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { setTermMarkedKnownAction } from "@/app/(private)/jargon/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** A compact "I already know this" for a glossary row, so the option stays
 *  available for new terms without outweighing the definition itself. */
export function StoryMarkKnown({ termId, term }: { termId: string; term: string }) {
  const [marked, setMarked] = useState(false);
  const { toast } = useToast();

  if (marked) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <Check className="size-3.5" aria-hidden strokeWidth={2.5} />
        Known
      </span>
    );
  }

  return (
    <Button
      type="button"
      size="xs"
      variant="ghost"
      aria-label={`Mark ${term} as known`}
      className="h-7 px-2 text-xs font-medium text-base-content/60 hover:text-base-content"
      onPress={async () => {
        setMarked(true);
        const { error } = await setTermMarkedKnownAction(termId, true);
        if (error) {
          setMarked(false);
          toast("Couldn't mark that term known — it may show up again.", "destructive");
        }
      }}
    >
      I know this
    </Button>
  );
}
