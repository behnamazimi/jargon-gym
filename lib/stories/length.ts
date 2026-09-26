import type { DomainLanguage } from "@/lib/jargon/languages";
import type { CefrLevel } from "./types";

type LengthUnit = "words" | "characters";

// Languages written without spaces between words (Chinese, Japanese, Thai)
// should use "characters" here, so length limits and counts stay meaningful.
const LENGTH_UNIT: Record<DomainLanguage, LengthUnit> = {
  en: "words",
  nl: "words",
};

// Roughly how many characters one word's worth of meaning takes in a
// language written without spaces.
const CHARACTERS_PER_WORD = 2;
const WORDS_PER_TERM = 15;
const MIN_WORDS = 70;
const RANGE_WORDS = 50;
// Beginner levels need more room: shorter sentences carry less per word.
const LEVEL_FACTOR: Partial<Record<CefrLevel, number>> = { A1: 1.25, A2: 1.15 };

export type StoryLength = { min: number; max: number; unit: LengthUnit };

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5;
}

function inUnit(words: number, unit: LengthUnit): number {
  return unit === "characters" ? words * CHARACTERS_PER_WORD : words;
}

/** The length to ask for: enough room for every term to appear naturally,
 *  a bit more at beginner levels. */
export function storyLength(
  termCount: number,
  cefrLevel: CefrLevel,
  language: DomainLanguage,
): StoryLength {
  const unit = LENGTH_UNIT[language];
  const factor = LEVEL_FACTOR[cefrLevel] ?? 1;
  const min = roundToFive(Math.max(MIN_WORDS, termCount * WORDS_PER_TERM) * factor);
  return {
    min: inUnit(min, unit),
    max: inUnit(min + roundToFive(RANGE_WORDS * factor), unit),
    unit,
  };
}

/** The same length unit for a phrase like "up to about 10 words". */
export function lengthPhrase(words: number, unit: LengthUnit): string {
  return `${inUnit(words, unit)} ${unit}`;
}

/** How far a finished piece may stray from the asked-for length before it
 *  is rejected and retried. */
export function acceptedLength(length: StoryLength): { min: number; max: number } {
  return { min: Math.floor(length.min * 0.5), max: Math.ceil(length.max * 1.5) };
}

export function countLength(text: string, unit: LengthUnit): number {
  if (unit === "characters") return text.replace(/[^\p{L}\p{N}]/gu, "").length;
  return text.split(/[^\p{L}\p{N}]+/u).filter(Boolean).length;
}
