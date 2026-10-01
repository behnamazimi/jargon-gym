"use client";

import { Button } from "@/components/ui/button";

type PastedListPromptProps = {
  lines: string[];
  onAddAsList: () => void;
  onKeepAsOne: () => void;
};

/** Shown when several lines are pasted into the Term box. */
export function PastedListPrompt({ lines, onAddAsList, onKeepAsOne }: PastedListPromptProps) {
  return (
    <div
      className="space-y-2 rounded-xl bg-base-200/60 p-3"
      role="group"
      aria-label="You pasted a list"
    >
      <p className="m-0 font-medium">You pasted {lines.length} lines</p>
      <p className="m-0 text-sm text-base-content/60">
        Add them as separate terms? You&apos;ll check them before anything is saved.
      </p>
      <Button type="button" className="min-h-11 w-full" onPress={onAddAsList}>
        Add {lines.length} terms
      </Button>
      <Button type="button" variant="outline" className="min-h-11 w-full" onPress={onKeepAsOne}>
        Keep as one
      </Button>
    </div>
  );
}
