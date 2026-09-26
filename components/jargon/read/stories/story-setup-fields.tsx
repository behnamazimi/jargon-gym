"use client";

import { Button } from "@/components/ui/button";
import { termsForLength } from "@/lib/stories/length";
import {
  PIECE_LENGTHS,
  READING_LEVELS,
  type PieceLength,
  type ReadingLevel,
} from "@/lib/stories/types";
import { cn } from "@/lib/utils";

type Choice = { label: string; hint: string };

const READING_LEVEL_CHOICES: Record<ReadingLevel, Choice> = {
  plain: { label: "Plain", hint: "Context makes each term guessable." },
  professional: { label: "Professional", hint: "Help only where a term would be unclear." },
  expert: { label: "Expert", hint: "Terms used as an insider would, no extra help." },
};

const PIECE_LENGTH_CHOICES: Record<PieceLength, Choice> = {
  short: {
    label: "Short",
    hint: `A quick read of a paragraph or two, with up to ${termsForLength("short")} terms.`,
  },
  medium: {
    label: "Medium",
    hint: `A few short paragraphs, with up to ${termsForLength("medium")} terms.`,
  },
  long: {
    label: "Long",
    hint: `A fuller piece of several paragraphs, with up to ${termsForLength("long")} terms.`,
  },
};

function ChoiceField<T extends string>({
  legend,
  options,
  choices,
  value,
  onChange,
}: {
  legend: string;
  options: readonly T[];
  choices: Record<T, Choice>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 text-sm font-medium leading-none">{legend}</legend>
      <div className="flex gap-2">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant="outline"
            onPress={() => onChange(option)}
            aria-pressed={value === option}
            className={cn(
              "min-h-11 flex-1 px-2",
              value === option && "border-primary bg-primary/10 text-primary hover:bg-primary/15",
            )}
          >
            {choices[option].label}
          </Button>
        ))}
      </div>
      <p className="m-0 text-xs leading-relaxed text-base-content/60">{choices[value].hint}</p>
    </fieldset>
  );
}

export function ReadingLevelField(props: {
  value: ReadingLevel;
  onChange: (level: ReadingLevel) => void;
}) {
  return (
    <ChoiceField
      legend="Term support"
      options={READING_LEVELS}
      choices={READING_LEVEL_CHOICES}
      {...props}
    />
  );
}

export function PieceLengthField(props: {
  value: PieceLength;
  onChange: (length: PieceLength) => void;
}) {
  return (
    <ChoiceField
      legend="Length"
      options={PIECE_LENGTHS}
      choices={PIECE_LENGTH_CHOICES}
      {...props}
    />
  );
}
