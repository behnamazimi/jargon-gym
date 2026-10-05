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

/** Where a builder gets other terms from. Builders depend on this, never on a database. */
export type DistractorSource = {
  pick(term: QuizTerm, count: number, options?: PickDistractorsOptions): Promise<DistractorTerm[]>;
  /** Other terms in the term's collection whose definition is identical. */
  sameDefinition(term: QuizTerm): Promise<DistractorTerm[]>;
};
