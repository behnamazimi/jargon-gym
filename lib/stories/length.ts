import type { CollectionLanguage } from "@/lib/terms/languages";
import type { CefrLevel, PieceLength } from "./types";

type LengthUnit = "words" | "characters";

// Languages written without spaces between words (Chinese, Japanese, Thai)
// should use "characters" here, so length limits and counts stay meaningful.
const LENGTH_UNIT: Record<CollectionLanguage, LengthUnit> = {
  en: "words",
  nl: "words",
  es: "words",
  fr: "words",
  de: "words",
  it: "words",
  pt: "words",
  ru: "words",
  tr: "words",
  ja: "characters",
  ko: "words",
  zh: "characters",
};

// Roughly how many characters one word's worth of meaning takes in a
// language written without spaces.
const CHARACTERS_PER_WORD = 2;
// Beginner levels need more room: shorter sentences carry less per word.
const LEVEL_FACTOR: Partial<Record<CefrLevel, number>> = { A1: 1.25, A2: 1.15 };

// What each length the user can pick means. `terms` is what the length is
// charged for; `minTerms` is the fewest the piece must use to be kept.
const PIECE_LENGTH_SPEC: Record<
  PieceLength,
  { words: [number, number]; paragraphs: string; turns: number; terms: number; minTerms: number }
> = {
  short: { words: [40, 70], paragraphs: "1 or 2", turns: 5, terms: 6, minTerms: 1 },
  medium: { words: [70, 120], paragraphs: "2 or 3", turns: 8, terms: 8, minTerms: 2 },
  long: { words: [120, 190], paragraphs: "3 to 5", turns: 12, terms: 10, minTerms: 3 },
};

/** How many terms every story is offered, whatever its length. The model uses
 *  the ones that fit, so a short piece still has enough to pick from. */
export const STORY_TERM_POOL = 10;

export type StoryLength = {
  min: number;
  max: number;
  unit: LengthUnit;
  /** How many paragraphs to ask for, like "2 or 3". */
  paragraphs: string;
  /** The most paragraphs a thread, interview or notes may use, one per turn. */
  turns: number;
};

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5;
}

function inUnit(words: number, unit: LengthUnit): number {
  return unit === "characters" ? words * CHARACTERS_PER_WORD : words;
}

/** How many terms a story of this length is charged for. */
export function termsForLength(pieceLength: PieceLength): number {
  return PIECE_LENGTH_SPEC[pieceLength].terms;
}

export function minTermsForLength(pieceLength: PieceLength): number {
  return PIECE_LENGTH_SPEC[pieceLength].minTerms;
}

/** The length to ask for: the user's pick, with a bit more room at beginner
 *  levels. */
export function storyLength(
  pieceLength: PieceLength,
  cefrLevel: CefrLevel,
  language: CollectionLanguage,
): StoryLength {
  const spec = PIECE_LENGTH_SPEC[pieceLength];
  const unit = LENGTH_UNIT[language];
  const factor = LEVEL_FACTOR[cefrLevel] ?? 1;
  const [min, max] = spec.words.map((words) => inUnit(roundToFive(words * factor), unit));
  return { min: min!, max: max!, unit, paragraphs: spec.paragraphs, turns: spec.turns };
}

/** A length in the story's unit, like "10 words". */
export function lengthPhrase(words: number, unit: LengthUnit): string {
  return `${inUnit(words, unit)} ${unit}`;
}

/** How far a finished piece may stray from the asked-for length before it
 *  is rejected and retried. */
export type LengthRange = Pick<StoryLength, "min" | "max" | "unit">;

export function acceptedLength(length: LengthRange): { min: number; max: number } {
  return { min: Math.floor(length.min * 0.5), max: Math.ceil(length.max * 1.5) };
}

function splitWords(text: string): string[] {
  return text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

export function countLength(text: string, unit: LengthUnit): number {
  if (unit === "characters") return text.replace(/[^\p{L}\p{N}]/gu, "").length;
  return splitWords(text).length;
}
