"use client";

import { Settings2, XIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog as AriaDialog, DialogTrigger, Popover } from "react-aria-components";
import { saveReadOptionAction } from "@/app/(private)/jargon/read/actions";
import { OptionRow } from "@/components/jargon/read/read-option-row";
import { ShadowingOptionRows } from "@/components/jargon/read/shadowing-option-rows";
import { isStoriesPath } from "@/components/jargon/read/read-mode-tabs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useMediaQuery } from "@/hooks/use-platform";
import { PLATFORM_MEDIA } from "@/lib/platform";
import type { ReadOptionKey, ReadOptions } from "@/lib/read/options";

type SwitchOptionKey = "storiesDefault" | "revealedDefault" | "hideQuestion" | "narrationHighlight";

const OPTION_ROWS: { key: SwitchOptionKey; label: string; description: string }[] = [
  {
    key: "storiesDefault",
    label: "Open Stories by default",
    description: "Read starts on the Stories tab instead of Cards.",
  },
  {
    key: "revealedDefault",
    label: "Show definitions right away",
    description: "Cards open revealed. A card counts as read when it's shown.",
  },
  {
    key: "hideQuestion",
    label: "Hide “What is …?”",
    description: "The hidden card shows just the term.",
  },
  {
    key: "narrationHighlight",
    label: "Highlight text while listening",
    description: "Stories follow the narration sentence by sentence.",
  },
];

function disabledNoteFor(key: SwitchOptionKey, options: ReadOptions): string | undefined {
  if (key === "hideQuestion" && options.revealedDefault) {
    return "Not used while definitions show right away.";
  }
  if (key === "narrationHighlight" && options.shadowing) {
    return "Always on while Shadowing is on.";
  }
  return undefined;
}

function OptionsList({
  options,
  onStories,
  onChange,
}: {
  options: ReadOptions;
  onStories: boolean;
  onChange: (key: ReadOptionKey, value: boolean | number) => void;
}) {
  return (
    <ul className="m-0 list-none divide-y divide-base-300/60 p-0">
      {OPTION_ROWS.filter((row) => onStories || row.key !== "narrationHighlight").map((row) => (
        <OptionRow
          key={row.key}
          id={`read-option-${row.key}`}
          label={row.label}
          description={row.description}
          checked={options[row.key] || (row.key === "narrationHighlight" && options.shadowing)}
          disabledNote={disabledNoteFor(row.key, options)}
          onChange={(checked) => onChange(row.key, checked)}
        />
      ))}
      {onStories ? <ShadowingOptionRows options={options} onChange={onChange} /> : null}
    </ul>
  );
}

function GearButton({ onPress }: { onPress?: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Read options"
      data-tour="read-options"
      onPress={onPress}
      className="size-11 shrink-0 text-base-content/70 md:size-9"
    >
      <Settings2 className="size-4" aria-hidden strokeWidth={1.5} />
    </Button>
  );
}

function sameOptions(a: ReadOptions, b: ReadOptions): boolean {
  return (Object.keys(a) as ReadOptionKey[]).every((key) => a[key] === b[key]);
}

/** Gear next to the Cards/Stories switch: a bottom sheet on phone (like the
 *  More sheet), a dropdown-style popover on desktop. Saves each toggle as it
 *  changes. */
export function ReadOptionsMenu({ initialOptions }: { initialOptions: ReadOptions }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(initialOptions);
  // An option can also be changed elsewhere (the Shadowing chip on a story), so
  // follow the saved values when they change.
  const [saved, setSaved] = useState(initialOptions);
  if (!sameOptions(saved, initialOptions)) {
    setSaved(initialOptions);
    setOptions(initialOptions);
  }
  const isPhone = useMediaQuery(PLATFORM_MEDIA.phone, true);
  const router = useRouter();
  const onStories = isStoriesPath(usePathname());
  const { toast } = useToast();

  async function update(key: ReadOptionKey, value: boolean | number) {
    const previous = options[key];
    setOptions((current) => ({ ...current, [key]: value }));
    const result = await saveReadOptionAction(key, value);
    if (result.error) {
      setOptions((current) => ({ ...current, [key]: previous }));
      toast(result.error, "destructive");
      return;
    }
    // The Stories default only matters the next time Read opens; refreshing
    // now would move the user off the page they're on.
    if (key !== "storiesDefault") router.refresh();
  }

  const list = (
    <OptionsList
      options={options}
      onStories={onStories}
      onChange={(key, value) => void update(key, value)}
    />
  );

  if (!isPhone) {
    return (
      <DialogTrigger isOpen={open} onOpenChange={setOpen}>
        <GearButton />
        <Popover
          placement="bottom end"
          offset={6}
          className="dropdown-content z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-box bg-base-100 shadow-md ring-1 ring-base-content/10"
        >
          <AriaDialog
            aria-label="Read options"
            className="max-h-[min(36rem,80dvh)] overflow-y-auto outline-none"
          >
            <p className="m-0 border-b border-base-300/60 px-4 py-3 text-sm font-medium">
              Read options
            </p>
            {list}
          </AriaDialog>
        </Popover>
      </DialogTrigger>
    );
  }

  return (
    <>
      <GearButton onPress={() => setOpen(true)} />
      <Sheet
        isOpen={open}
        onOpenChange={setOpen}
        side="bottom"
        showCloseButton={false}
        className="max-h-[min(36rem,85dvh)] rounded-t-2xl pb-safe"
      >
        <SheetHeader className="border-b border-base-300 px-4 py-3">
          <div className="flex items-center gap-1">
            <SheetTitle className="min-w-0 flex-1">Read options</SheetTitle>
            <SheetClose className="shrink-0">
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
        </SheetHeader>
        <div className="min-h-0 overflow-y-auto">{list}</div>
      </Sheet>
    </>
  );
}
