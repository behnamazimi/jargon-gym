"use client";

import { useState, useTransition } from "react";
import { setNarrationCaps } from "@/app/(private)/admin/narration/actions";
import { Button } from "@/components/ui/button";
import type { NarrationSettings } from "@/lib/jargon/admin/narration-settings";

type Props = { caps: NarrationSettings["caps"]; usageLast24h: NarrationSettings["usageLast24h"] };

function parseCap(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export function AdminNarrationCaps({ caps, usageLast24h }: Props) {
  const [term, setTerm] = useState(caps.term?.toString() ?? "");
  const [story, setStory] = useState(caps.story?.toString() ?? "");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await setNarrationCaps({ term: parseCap(term), story: Number(story) });
      setMessage(
        result.ok ? { text: "Saved.", isError: false } : { text: result.error, isError: true },
      );
    });
  }

  return (
    <section className="rounded-lg border border-base-300 px-4 py-3">
      <h2 className="m-0 text-lg font-semibold text-base-content">Daily limits per person</h2>
      <p className="m-0 text-sm text-base-content/65">
        How many new clips one person can have made in 24 hours. Clips that already exist are free,
        and failed attempts count. Leave the term limit blank for no limit.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="form-control">
          <span className="label-text text-sm">Term clips (last 24 h: {usageLast24h.term})</span>
          <input
            type="number"
            min={1}
            max={1000}
            className="input input-bordered w-full"
            value={term}
            placeholder="No limit"
            onChange={(event) => setTerm(event.target.value)}
          />
        </label>
        <label className="form-control">
          <span className="label-text text-sm">Story clips (last 24 h: {usageLast24h.story})</span>
          <input
            type="number"
            min={1}
            max={1000}
            className="input input-bordered w-full"
            value={story}
            onChange={(event) => setStory(event.target.value)}
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button type="button" onPress={handleSave} isDisabled={isPending}>
          Save limits
        </Button>
        {message ? (
          <p
            role={message.isError ? "alert" : "status"}
            className={`m-0 text-sm ${message.isError ? "text-error" : "text-base-content/65"}`}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
