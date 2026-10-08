"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { saveReadOptionAction } from "@/app/(private)/app/read/actions";
import { OptionRow } from "@/components/read/read-option-row";
import { ShadowingOptionRows } from "@/components/read/shadowing-option-rows";
import { isStoriesPath } from "@/components/read/read-mode-tabs";
import { OptionsMenu } from "@/components/shared/options-menu";
import { useToast } from "@/components/ui/toast";
import type { ReadOptionKey, ReadOptions } from "@/lib/read/options";

type SwitchOptionKey =
  | "storiesDefault"
  | "revealedDefault"
  | "hideQuestion"
  | "narrationHighlight"
  | "tapToPlay";

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
  {
    key: "tapToPlay",
    label: "Tap a sentence to play it",
    description: "Plays that sentence, then pauses unless the narration is already playing.",
  },
];

const STORIES_ONLY_KEYS = new Set<SwitchOptionKey>(["narrationHighlight", "tapToPlay"]);

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
      {OPTION_ROWS.filter((row) => onStories || !STORIES_ONLY_KEYS.has(row.key)).map((row) => (
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

function sameOptions(a: ReadOptions, b: ReadOptions): boolean {
  return (Object.keys(a) as ReadOptionKey[]).every((key) => a[key] === b[key]);
}

/** Gear next to the Cards/Stories switch. Saves each toggle as it changes. */
export function ReadOptionsMenu({ initialOptions }: { initialOptions: ReadOptions }) {
  const [options, setOptions] = useState(initialOptions);
  // An option can also be changed elsewhere (the Shadowing chip on a story), so
  // follow the saved values when they change.
  const [saved, setSaved] = useState(initialOptions);
  if (!sameOptions(saved, initialOptions)) {
    setSaved(initialOptions);
    setOptions(initialOptions);
  }
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

  return (
    <OptionsMenu label="Read options" tourTarget="read-options">
      <OptionsList
        options={options}
        onStories={onStories}
        onChange={(key, value) => void update(key, value)}
      />
    </OptionsMenu>
  );
}
