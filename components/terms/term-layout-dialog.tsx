"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { TERM_LABELS } from "@/lib/terms/term-labels";
import { TERM_BLOCKS, type TermBlock } from "@/lib/terms/term-layout";
import type { TermLayoutAccess } from "./term-layout-provider";

const BLOCK_NAMES: Record<TermBlock, string> = {
  mentalModel: TERM_LABELS.en.mentalModel,
  example: TERM_LABELS.en.example,
  antiExample: TERM_LABELS.en.antiExample,
  discussion: TERM_LABELS.en.discussion,
  controversy: TERM_LABELS.en.controversy,
  note: TERM_LABELS.en.note,
  relationships: TERM_LABELS.en.relatedTerms,
  searchLink: "Google search link",
};

type Target = "collection" | "default";

function stop(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

/** Edits what sits under "More" for this collection or for all of them. It
 *  starts from the layout it is mounted with, so mount a fresh one each time
 *  it opens. */
export function TermLayoutDialog({
  domainId,
  access,
  isOpen,
  onOpenChange,
}: {
  domainId: string | undefined;
  access: TermLayoutAccess;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { placement, hasOverride, save } = access;
  const canTargetCollection = Boolean(domainId);
  const [draft, setDraft] = useState(placement);
  const [target, setTarget] = useState<Target>(canTargetCollection ? "collection" : "default");
  const [isPending, startTransition] = useTransition();

  function submit(change: Parameters<typeof save>[0]) {
    startTransition(async () => {
      if (await save(change)) onOpenChange(false);
    });
  }

  return (
    // The dialog is a React child of the card, so its events would reach the
    // card's swipe and flip handlers.
    <div
      onPointerDown={stop}
      onPointerMove={stop}
      onPointerUp={stop}
      onPointerCancel={stop}
      onClick={stop}
    >
      <Dialog isOpen={isOpen} onOpenChange={onOpenChange} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>What shows on a term</DialogTitle>
          <p className="m-0 text-sm text-base-content/70">
            The definition always shows. Turn a part off to keep it under More.
          </p>
        </DialogHeader>

        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {TERM_BLOCKS.map((block) => (
            <li key={block}>
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
                <span className="text-sm">{BLOCK_NAMES[block]}</span>
                <Switch
                  checked={draft[block] === "shown"}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, [block]: checked ? "shown" : "more" })
                  }
                />
              </label>
            </li>
          ))}
        </ul>

        {canTargetCollection ? (
          <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
            <legend className="sr-only">Apply to</legend>
            {(
              [
                ["collection", "This collection"],
                ["default", "All collections"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex min-h-9 cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="term-layout-scope"
                  className="radio radio-sm"
                  checked={target === value}
                  onChange={() => setTarget(value)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </fieldset>
        ) : null}

        {hasOverride && target === "default" ? (
          <p className="m-0 text-sm text-base-content/70">
            This collection has its own layout, so it won't change here. Choose “Use my default
            here” to follow the new one.
          </p>
        ) : null}

        <DialogFooter>
          {hasOverride && domainId ? (
            <Button
              variant="ghost"
              isDisabled={isPending}
              className="sm:me-auto"
              onPress={() => submit({ scope: "reset-collection", domainId })}
            >
              Use my default here
            </Button>
          ) : null}
          <Button
            isDisabled={isPending}
            onPress={() =>
              submit(
                target === "collection" && domainId
                  ? { scope: "collection", domainId, placement: draft }
                  : { scope: "default", placement: draft },
              )
            }
          >
            Save
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
