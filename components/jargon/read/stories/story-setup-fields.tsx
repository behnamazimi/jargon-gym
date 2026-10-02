"use client";

import { Button } from "@/components/ui/button";
import { termsUsedNote } from "@/lib/stories/length";
import {
  PIECE_LENGTHS,
  READING_LEVELS,
  type PieceLength,
  type ReadingLevel,
} from "@/lib/stories/types";
import { cn } from "@/lib/utils";

type Choice = { label: string; hint: string };

const READING_LEVEL_CHOICES: Record<ReadingLevel, Choice> = {
  plain: { label: "A lot", hint: "Sentences make each term easy to guess." },
  professional: { label: "Some", hint: "Help only where a term would be unclear." },
  expert: { label: "None", hint: "Terms used as an insider would, no extra help." },
};

const PIECE_LENGTH_BASE: Record<PieceLength, Choice> = {
  short: { label: "Short", hint: "A quick read of a paragraph or two." },
  medium: { label: "Medium", hint: "A few short paragraphs." },
  long: { label: "Long", hint: "A fuller piece of several paragraphs." },
};

export const PIECE_LENGTH_LABELS: Record<PieceLength, string> = {
  short: PIECE_LENGTH_BASE.short.label,
  medium: PIECE_LENGTH_BASE.medium.label,
  long: PIECE_LENGTH_BASE.long.label,
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
            size="sm"
            onPress={() => onChange(option)}
            aria-pressed={value === option}
            className={cn(
              "flex-1 px-2",
              value === option &&
                "border-primary bg-primary/10 text-primary-text hover:bg-primary/15",
            )}
          >
            {choices[option].label}
          </Button>
        ))}
      </div>
      <p className="m-0 text-xs text-base-content/70">{choices[value].hint}</p>
    </fieldset>
  );
}

export function ReadingLevelField(props: {
  value: ReadingLevel;
  onChange: (level: ReadingLevel) => void;
}) {
  return (
    <ChoiceField
      legend="How much to explain each term"
      options={READING_LEVELS}
      choices={READING_LEVEL_CHOICES}
      {...props}
    />
  );
}

export function PieceLengthField({
  termsAvailable,
  ...props
}: {
  value: PieceLength;
  termsAvailable: number;
  onChange: (length: PieceLength) => void;
}) {
  const choices = Object.fromEntries(
    PIECE_LENGTHS.map((length) => [
      length,
      {
        label: PIECE_LENGTH_BASE[length].label,
        hint: `${PIECE_LENGTH_BASE[length].hint} ${termsUsedNote(length, termsAvailable)}`.trim(),
      },
    ]),
  ) as Record<PieceLength, Choice>;

  return <ChoiceField legend="Length" options={PIECE_LENGTHS} choices={choices} {...props} />;
}
