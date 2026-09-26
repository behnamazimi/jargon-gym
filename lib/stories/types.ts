import { DOMAIN_LANGUAGES, type DomainLanguage } from "@/lib/jargon/languages";

export const STORY_MIN_TERMS = 3;
export const STORY_OUTLINE_MAX = 280;
export const STORY_NARRATION_DAILY_CAP = 20;

export const READING_LEVELS = ["plain", "professional", "expert"] as const;
export type ReadingLevel = (typeof READING_LEVELS)[number];

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const PIECE_LENGTHS = ["short", "medium", "long"] as const;
export type PieceLength = (typeof PIECE_LENGTHS)[number];

export const DEFAULT_READING_LEVEL: ReadingLevel = "professional";
export const DEFAULT_CEFR_LEVEL: CefrLevel = "B2";
export const DEFAULT_PIECE_LENGTH: PieceLength = "medium";

/** The per-collection setup the user picks: how much help terms get, the
 *  language level, and how long the piece is. */
export type StoryLevels = {
  readingLevel: ReadingLevel;
  cefrLevel: CefrLevel;
  pieceLength: PieceLength;
};

export function parseReadingLevel(value: string): ReadingLevel {
  return (READING_LEVELS as readonly string[]).includes(value)
    ? (value as ReadingLevel)
    : DEFAULT_READING_LEVEL;
}

export function parseCefrLevel(value: string): CefrLevel {
  return (CEFR_LEVELS as readonly string[]).includes(value)
    ? (value as CefrLevel)
    : DEFAULT_CEFR_LEVEL;
}

export function parsePieceLength(value: string): PieceLength {
  return (PIECE_LENGTHS as readonly string[]).includes(value)
    ? (value as PieceLength)
    : DEFAULT_PIECE_LENGTH;
}

export function parseLanguage(value: string | null | undefined): DomainLanguage {
  return (DOMAIN_LANGUAGES as readonly string[]).includes(value ?? "")
    ? (value as DomainLanguage)
    : "en";
}

export type StorySegment = { text: string; termId?: string };

export type Story = {
  id: string;
  domainId: string | null;
  language: DomainLanguage;
  format: string;
  tone: string;
  readingLevel: ReadingLevel;
  cefrLevel: CefrLevel;
  pieceLength: PieceLength;
  outline: string | null;
  title: string;
  segments: StorySegment[];
  termIds: string[];
  newTermIds: string[];
  vote: -1 | 1 | null;
  readAt: string | null;
};

/** What the reader needs to show a term's popover and glossary row. A term
 *  deleted after generation has no entry, and the UI shows it as gone. */
export type StoryTerm = {
  id: string;
  term: string;
  definition: string;
};

export type StoryVote = {
  format: string;
  tone: string;
  vote: -1 | 1;
  createdAt: Date;
};
