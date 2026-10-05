"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { TERM_LABELS } from "@/lib/terms/term-labels";
import { TERM_BLOCKS, type Placement, type TermBlock } from "@/lib/terms/term-layout";
import { useTermLayoutScope } from "./term-layout-provider";

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

type Scope = "collection" | "default";

function stop(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

/** The one place a learner changes what sits under "More". It is a quiet text
 *  button under the term; the dialog edits this collection or all of them. */
export function TermLayoutCustomize({ domainId }: { domainId: string | undefined }) {
  const scope = useTermLayoutScope(domainId);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Placement | null>(null);
  const [target, setTarget] = useState<Scope>("collection");
  const [isPending, startTransition] = useTransition();

  if (!scope) return null;
  const { placement, hasOverride, save } = scope;
  const canTargetCollection = Boolean(domainId);
  const current = draft ?? placement;

  function open() {
    setDraft(placement);
    setTarget(canTargetCollection ? "collection" : "default");
    setIsOpen(true);
  }

  function submit(change: Parameters<typeof save>[0]) {
    startTransition(async () => {
      if (await save(change)) setIsOpen(false);
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="xs"
        className="font-normal text-base-content/60 hover:text-base-content"
        onPress={open}
      >
        Customize
      </Button>
      {/* The dialog is a React child of the card, so its events would reach the
          card's swipe and flip handlers. */}
      <div
        onPointerDown={stop}
        onPointerMove={stop}
        onPointerUp={stop}
        onPointerCancel={stop}
        onClick={stop}
      >
        <Dialog isOpen={isOpen} onOpenChange={setIsOpen} className="max-w-sm">
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
                    checked={current[block] === "shown"}
                    onCheckedChange={(checked) =>
                      setDraft({
                        ...current,
                        [block]: checked ? "shown" : "more",
                      })
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
                    ? { scope: "collection", domainId, placement: current }
                    : { scope: "default", placement: current },
                )
              }
            >
              Save
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </>
  );
}
