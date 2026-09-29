"use client";

import { useState, type FormEvent } from "react";
import { setNarrationCaps } from "@/app/(private)/admin/ai/narration/actions";
import { AdminSection } from "@/components/admin/admin-section";
import { useAdminAction } from "@/hooks/use-admin-action";
import type { NarrationSettings } from "@/lib/jargon/admin/narration-settings";
import { capsSchema } from "@/lib/narration/caps-schema";

type Props = { caps: NarrationSettings["caps"]; usageLast24h: NarrationSettings["usageLast24h"] };

/** An empty field is not a zero. */
function toNumber(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function usageLabel(count: number | null): string {
  return count === null ? "unknown" : String(count);
}

export function AdminNarrationCaps({ caps, usageLast24h }: Props) {
  const [term, setTerm] = useState(caps.term?.toString() ?? "");
  const [story, setStory] = useState(caps.story?.toString() ?? "");
  const [invalid, setInvalid] = useState(false);
  const { run, isPending, error, clearError } = useAdminAction();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = capsSchema.safeParse({
      term: term.trim() === "" ? null : toNumber(term),
      story: toNumber(story),
    });
    setInvalid(!parsed.success);
    if (!parsed.success) return;
    void run(() => setNarrationCaps(parsed.data), { successMessage: "Limits saved." });
  }

  function edit(setter: (value: string) => void, value: string) {
    setInvalid(false);
    clearError();
    setter(value);
  }

  return (
    <AdminSection
      id="narration-caps"
      title="Daily limits per person"
      description="How many new clips one person can have made in 24 hours. Clips that already exist are free, and failed attempts count. Leave the term limit blank for no limit."
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm">Term clips (last 24 h: {usageLabel(usageLast24h.term)})</span>
            <input
              type="number"
              className="input input-bordered w-full"
              value={term}
              placeholder="No limit"
              onChange={(event) => edit(setTerm, event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">
              Story clips (last 24 h: {usageLabel(usageLast24h.story)})
            </span>
            <input
              type="number"
              className="input input-bordered w-full"
              value={story}
              onChange={(event) => edit(setStory, event.target.value)}
            />
          </label>
        </div>
        {invalid ? (
          <p role="alert" className="m-0 text-sm text-error">
            Enter whole numbers from 1 to 1000. Stories need a limit.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="m-0 text-sm text-error">
            {error}
          </p>
        ) : null}
        <div>
          <button type="submit" className="btn btn-primary" disabled={isPending}>
            {isPending ? "Saving…" : "Save limits"}
          </button>
        </div>
      </form>
    </AdminSection>
  );
}
