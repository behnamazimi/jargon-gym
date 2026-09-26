"use client";

import { Settings2, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
    <li>
      <label
        htmlFor={id}
        className={cn(
          "flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium text-base-content">{label}</span>
          <span className="block text-xs leading-relaxed text-base-content/60">
            {disabledNote ?? description}
          </span>
        </span>
        <Switch
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
          className="toggle-primary shrink-0"
        />
      </label>
    </li>
  );
}

/** Gear next to the Cards/Stories switch. A bottom sheet on phone (like the
 *  More sheet), a side sheet on desktop. Saves each toggle as it changes. */
export function ReadOptionsSheet({ initialOptions }: { initialOptions: ReadOptions }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(initialOptions);
  const isPhone = useMediaQuery(PLATFORM_MEDIA.phone, true);
  const router = useRouter();
  const { toast } = useToast();

  async function update(key: ReadOptionKey, value: boolean) {
    const previous = options;
    setOptions({ ...options, [key]: value });
    const result = await saveReadOptionAction(key, value);
    if (result.error) {
      setOptions(previous);
      toast(result.error, "destructive");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Read options"
        onPress={() => setOpen(true)}
        className="size-11 shrink-0 text-base-content/70 md:size-9"
      >
        <Settings2 className="size-4" aria-hidden strokeWidth={1.5} />
      </Button>
      <Sheet
        isOpen={open}
        onOpenChange={setOpen}
        side={isPhone ? "bottom" : "right"}
        showCloseButton={false}
        className={cn(isPhone && "max-h-[min(36rem,85dvh)] rounded-t-2xl pb-safe")}
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
              onChange={(checked) => void update(row.key, checked)}
            />
          ))}
        </ul>
      </Sheet>
    </>
  );
}
