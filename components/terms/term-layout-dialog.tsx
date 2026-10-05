"use client";

import { XIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { ChoiceRow, OptionRow } from "@/components/read/read-option-row";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-platform";
import { PLATFORM_MEDIA } from "@/lib/platform";
import { TERM_LABELS } from "@/lib/terms/term-labels";
import { TERM_BLOCKS, type TermBlock } from "@/lib/terms/term-layout";
import type { TermLayoutAccess } from "./term-layout-provider";

const BLOCKS: Record<TermBlock, { label: string; description: string }> = {
  mentalModel: { label: TERM_LABELS.en.mentalModel, description: "A way to picture it." },
  example: { label: TERM_LABELS.en.example, description: "The term used in a sentence." },
  antiExample: { label: TERM_LABELS.en.antiExample, description: "A case where it doesn't fit." },
  discussion: { label: TERM_LABELS.en.discussion, description: "How it plays out in real use." },
  controversy: { label: TERM_LABELS.en.controversy, description: "Where people disagree." },
  note: {
    label: TERM_LABELS.en.note,
    description: "Extra details, like a translation or pronunciation.",
  },
  relationships: { label: TERM_LABELS.en.relatedTerms, description: "Links to related terms." },
  searchLink: { label: "Google search link", description: "Look the term up on Google." },
};

type Target = "collection" | "default";

const TARGETS: { value: Target; label: string }[] = [
  { value: "collection", label: "This collection" },
  { value: "default", label: "All collections" },
];

function stop(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

/** Edits what sits under "More" for this collection or for all of them: a
 *  bottom sheet on phone and a dialog on larger screens, like Read options.
 *  It starts from the layout it is mounted with, so mount a fresh one each
 *  time it opens. */
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
  const isPhone = useMediaQuery(PLATFORM_MEDIA.phone, true);
  const [draft, setDraft] = useState(placement);
  const [target, setTarget] = useState<Target>(domainId ? "collection" : "default");
  const [isPending, startTransition] = useTransition();

  function submit(change: Parameters<typeof save>[0]) {
    startTransition(async () => {
      if (await save(change)) onOpenChange(false);
    });
  }

  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <p className="m-0 px-4 py-3 text-xs text-base-content/70">
        The definition always shows. Parts you turn off sit under More.
      </p>
      <ul className="m-0 list-none divide-y divide-base-300/60 border-t border-base-300/60 p-0">
        {TERM_BLOCKS.map((block) => (
          <OptionRow
            key={block}
            id={`term-layout-${block}`}
            label={BLOCKS[block].label}
            description={BLOCKS[block].description}
            checked={draft[block] === "shown"}
            onChange={(checked) => setDraft({ ...draft, [block]: checked ? "shown" : "more" })}
          />
        ))}
        {domainId ? (
          <ChoiceRow label="Apply to" options={TARGETS} value={target} onChange={setTarget} />
        ) : null}
      </ul>
      {hasOverride && target === "default" ? (
        <p className="m-0 border-t border-base-300/60 px-4 py-3 text-xs text-base-content/70">
          This collection has its own layout, so it won't change here. Choose “Use my default here”
          to follow the new one.
        </p>
      ) : null}
    </div>
  );

  const footer = (
    <div className="flex shrink-0 items-center gap-2 border-t border-base-300 px-4 py-3">
      {hasOverride && domainId ? (
        <Button
          variant="ghost"
          size="sm"
          isDisabled={isPending}
          onPress={() => submit({ scope: "reset-collection", domainId })}
        >
          Use my default here
        </Button>
      ) : null}
      <Button
        className="ms-auto min-w-24"
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
    </div>
  );

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
      {isPhone ? (
        <Sheet
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          side="bottom"
          showCloseButton={false}
          className="max-h-[min(40rem,90dvh)] rounded-t-2xl pb-safe"
        >
          <SheetHeader className="shrink-0 border-b border-base-300 px-4 py-3">
            <div className="flex items-center gap-1">
              <SheetTitle className="min-w-0 flex-1">What shows on a term</SheetTitle>
              <SheetClose className="shrink-0">
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </SheetClose>
            </div>
          </SheetHeader>
          {body}
          {footer}
        </Sheet>
      ) : (
        <Dialog isOpen={isOpen} onOpenChange={onOpenChange} className="max-w-md gap-0 p-0">
          <div className="flex min-h-0 flex-col">
            <div className="shrink-0 border-b border-base-300 py-3 ps-4 pe-12">
              <DialogTitle>What shows on a term</DialogTitle>
            </div>
            {body}
            {footer}
          </div>
        </Dialog>
      )}
    </div>
  );
}
