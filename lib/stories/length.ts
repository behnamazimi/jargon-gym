import type { DomainLanguage } from "@/lib/jargon/languages";
import type { CefrLevel, PieceLength } from "./types";

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
// Beginner levels need more room: shorter sentences carry less per word.
const LEVEL_FACTOR: Partial<Record<CefrLevel, number>> = { A1: 1.25, A2: 1.15 };

// What each length the user can pick means. Longer pieces carry more terms,
// so the number of terms per word stays about the same.
const PIECE_LENGTH_SPEC: Record<
  PieceLength,
  { words: [number, number]; paragraphs: string; turns: number; terms: number }
> = {
  short: { words: [50, 90], paragraphs: "1 or 2", turns: 5, terms: 6 },
  medium: { words: [90, 150], paragraphs: "2 or 3", turns: 8, terms: 8 },
  long: { words: [160, 240], paragraphs: "3 to 5", turns: 12, terms: 10 },
};

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

export function termsForLength(pieceLength: PieceLength): number {
  return PIECE_LENGTH_SPEC[pieceLength].terms;
}

/** The length to ask for: the user's pick, with a bit more room at beginner
 *  levels. */
export function storyLength(
  pieceLength: PieceLength,
  cefrLevel: CefrLevel,
  language: DomainLanguage,
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

/** A range in the story's unit, like "4 to 8 words". */
export function rangePhrase(minWords: number, maxWords: number, unit: LengthUnit): string {
  return `${inUnit(minWords, unit)} to ${lengthPhrase(maxWords, unit)}`;
}

/** How far a finished piece may stray from the asked-for length before it
 *  is rejected and retried. */
export type LengthRange = Pick<StoryLength, "min" | "max" | "unit">;

export function acceptedLength(length: LengthRange): { min: number; max: number } {
  return { min: Math.floor(length.min * 0.6), max: Math.ceil(length.max * 1.3) };
}

export function splitWords(text: string): string[] {
  return text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

export function countLength(text: string, unit: LengthUnit): number {
  if (unit === "characters") return text.replace(/[^\p{L}\p{N}]/gu, "").length;
  return splitWords(text).length;
}
