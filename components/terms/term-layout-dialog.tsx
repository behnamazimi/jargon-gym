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

/** Edits what sits under "More" for this collection or for all of them: a
 *  bottom sheet on phone and a dialog on larger screens, like Read options.
 *  It starts from the layout it is mounted with, so mount a fresh one each
 *  time it opens. Don't render it inside a card: it is a portal, and a card's
 *  handlers would see its events. */
export function TermLayoutDialog({
  collectionId,
  access,
  isOpen,
  onOpenChange,
}: {
  collectionId: string | undefined;
  access: TermLayoutAccess;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { placement, hasOverride, save } = access;
  const isPhone = useMediaQuery(PLATFORM_MEDIA.phone, true);
  const [draft, setDraft] = useState(placement);
  const [target, setTarget] = useState<Target>(collectionId ? "collection" : "default");
  const [isPending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function submit(change: Parameters<typeof save>[0]) {
    startTransition(async () => {
      const saved = await save(change);
      setFailed(!saved);
      if (saved) onOpenChange(false);
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
        {collectionId ? (
          <ChoiceRow label="Apply to" options={TARGETS} value={target} onChange={setTarget} />
        ) : null}
      </ul>
      {failed ? (
        <p
          role="alert"
          className="m-0 border-t border-base-300/60 px-4 py-3 text-xs text-error-text"
        >
          Couldn't save the layout. Try again.
        </p>
      ) : null}
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
      {hasOverride && collectionId ? (
        <Button
          variant="ghost"
          size="sm"
          isDisabled={isPending}
          onPress={() => submit({ scope: "reset-collection", collectionId })}
        >
          Use my default here
        </Button>
      ) : null}
      <Button
        className="ms-auto min-w-24"
        isDisabled={isPending}
        onPress={() =>
          submit(
            target === "collection" && collectionId
              ? { scope: "collection", collectionId, placement: draft }
              : { scope: "default", placement: draft },
          )
        }
      >
        Save
      </Button>
    </div>
  );

  return isPhone ? (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      side="bottom"
      showCloseButton={false}
      overlayClassName="z-[105]"
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
  );
}
