"use client";

import { ChoiceRow, OptionRow } from "@/components/read/read-option-row";
import type { ReadOptionKey, ReadOptions } from "@/lib/read/options";
import {
  SHADOWING_GAPS,
  SHADOWING_REPEATS,
  type ShadowingGap,
  type ShadowingRepeats,
} from "@/lib/stories/shadowing";

const GAP_CHOICES = SHADOWING_GAPS.map((gap) => ({ value: gap, label: `${gap}×` }));
const REPEAT_CHOICES = SHADOWING_REPEATS.map((repeats) => ({
  value: repeats,
  label: repeats === 0 ? "Endless" : String(repeats),
}));

/** Shadowing's switch, and its settings once it is on. */
export function ShadowingOptionRows({
  options,
  onChange,
}: {
  options: ReadOptions;
  onChange: (key: ReadOptionKey, value: boolean | number) => void;
}) {
  return (
    <>
      <OptionRow
        id="read-option-shadowing"
        label="Shadowing"
        description="Replay and pause sentence by sentence so you can repeat after the voice."
        checked={options.shadowing}
        onChange={(checked) => onChange("shadowing", checked)}
      />
      {options.shadowing ? (
        <>
          <OptionRow
            id="read-option-shadowingPause"
            label="Pause after each sentence"
            description="Gives you a moment to say it back before the next one."
            checked={options.shadowingPause}
            onChange={(checked) => onChange("shadowingPause", checked)}
          />
          {options.shadowingPause ? (
            <ChoiceRow<ShadowingGap>
              label="Pause length"
              options={GAP_CHOICES}
              value={options.shadowingGap}
              onChange={(value) => onChange("shadowingGap", value)}
            />
          ) : null}
          <ChoiceRow<ShadowingRepeats>
            label="Plays when repeating a sentence"
            options={REPEAT_CHOICES}
            value={options.shadowingRepeats}
            onChange={(value) => onChange("shadowingRepeats", value)}
          />
        </>
      ) : null}
    </>
  );
}
