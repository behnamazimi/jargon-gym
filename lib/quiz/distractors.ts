import type { QuizTerm } from "./types";

export type DistractorTerm = {
  id: string;
  term: string;
  definition: string;
  category: string | null;
};

export type PickDistractorsOptions = {
  /** Prefer terms sharing the term's category (same part of speech, topic). */
  preferCategory?: boolean;
};

/** Where wrong options come from. Builders depend on this, never on a database. */
export type DistractorSource = {
  pick(term: QuizTerm, count: number, options?: PickDistractorsOptions): Promise<DistractorTerm[]>;
};
