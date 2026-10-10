import type { CollectionLanguage } from "@/lib/terms/languages";

export const STORY_MIN_TERMS = 3;
export const STORY_OUTLINE_MAX = 280;

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const PIECE_LENGTHS = ["short", "medium", "long"] as const;
export type PieceLength = (typeof PIECE_LENGTHS)[number];

export const DEFAULT_CEFR_LEVEL: CefrLevel = "B2";
export const DEFAULT_PIECE_LENGTH: PieceLength = "medium";

/** The per-collection setup the user picks: the language level and how long
 *  the piece is. */
export type StoryLevels = {
  cefrLevel: CefrLevel;
  pieceLength: PieceLength;
};

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

export type StorySegment = { text: string; termId?: string };

export type Story = {
  id: string;
  collectionId: string | null;
  language: CollectionLanguage;
  format: string;
  tone: string;
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

/** One row of the story history list. */
export type StorySummary = Pick<Story, "format" | "tone" | "cefrLevel"> & {
  id: string;
  title: string;
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
