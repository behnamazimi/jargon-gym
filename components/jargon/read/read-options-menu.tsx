"use client";

import { Settings2, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog as AriaDialog, DialogTrigger, Popover } from "react-aria-components";
import { saveReadOptionAction } from "@/app/(private)/jargon/read/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useMediaQuery } from "@/hooks/use-platform";
import { PLATFORM_MEDIA } from "@/lib/platform";
import type { ReadOptionKey, ReadOptions } from "@/lib/read/options";
import { cn } from "@/lib/utils";

const OPTION_ROWS: { key: ReadOptionKey; label: string; description: string }[] = [
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
];

function OptionRow({
  id,
  label,
  description,
  checked,
  disabledNote,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabledNote?: string;
  onChange: (checked: boolean) => void;
}) {
  const disabled = Boolean(disabledNote);
  return (
    <li
      className={cn(
        "flex min-h-14 items-center justify-between gap-4 px-4 py-3",
        disabled && "opacity-50",
      )}
    >
      <div className="min-w-0">
        <label
          htmlFor={id}
          className={cn(
            "block text-sm font-medium text-base-content",
            disabled ? "cursor-not-allowed" : "cursor-pointer",
          )}
        >
          {label}
        </label>
        <p id={`${id}-description`} className="m-0 text-xs leading-relaxed text-base-content/60">
          {disabledNote ?? description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        aria-describedby={`${id}-description`}
        onCheckedChange={onChange}
        className="toggle-primary shrink-0"
      />
    </li>
  );
}

function OptionsList({
  options,
  onChange,
}: {
  options: ReadOptions;
  onChange: (key: ReadOptionKey, value: boolean) => void;
}) {
  return (
    <ul className="m-0 list-none divide-y divide-base-300/60 p-0">
      {OPTION_ROWS.map((row) => (
        <OptionRow
          key={row.key}
          id={`read-option-${row.key}`}
          label={row.label}
          description={row.description}
          checked={options[row.key]}
          disabledNote={
            row.key === "hideQuestion" && options.revealedDefault
              ? "Not used while definitions show right away."
              : undefined
          }
          onChange={(checked) => onChange(row.key, checked)}
        />
      ))}
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
      onPress={onPress}
      className="size-11 shrink-0 text-base-content/70 md:size-9"
    >
      <Settings2 className="size-4" aria-hidden strokeWidth={1.5} />
    </Button>
  );
}

/** Gear next to the Cards/Stories switch: a bottom sheet on phone (like the
 *  More sheet), a dropdown-style popover on desktop. Saves each toggle as it
 *  changes. */
export function ReadOptionsMenu({ initialOptions }: { initialOptions: ReadOptions }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(initialOptions);
  const isPhone = useMediaQuery(PLATFORM_MEDIA.phone, true);
  const router = useRouter();
  const { toast } = useToast();

  async function update(key: ReadOptionKey, value: boolean) {
    setOptions((current) => ({ ...current, [key]: value }));
    const result = await saveReadOptionAction(key, value);
    if (result.error) {
      setOptions((current) => ({ ...current, [key]: !value }));
      toast(result.error, "destructive");
      return;
    }
    // The Stories default only matters the next time Read opens; refreshing
    // now would move the user off the page they're on.
    if (key !== "storiesDefault") router.refresh();
  }

  const list = <OptionsList options={options} onChange={(key, value) => void update(key, value)} />;

  if (!isPhone) {
    return (
      <DialogTrigger isOpen={open} onOpenChange={setOpen}>
        <GearButton />
        <Popover
          placement="bottom end"
          offset={6}
          className="dropdown-content z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-box bg-base-100 shadow-md ring-1 ring-base-content/10"
        >
          <AriaDialog aria-label="Read options" className="outline-none">
            <p className="m-0 border-b border-base-300/60 px-4 py-2.5 text-sm font-medium">
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
        {list}
      </Sheet>
    </>
  );
}
