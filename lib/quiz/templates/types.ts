import type { CollectionKind } from "@/lib/terms/kinds";
import type { DistractorSource } from "../distractors";
import type { Rng } from "../random";
import type {
  PlannedTemplateId,
  QuizChannel,
  QuizQuestion,
  QuizResponse,
  QuizTerm,
} from "../types";

export type BuildContext = {
  source: DistractorSource;
  rng: Rng;
};

export type BooleanLabels = { yes: string; no: string };

export type QuizTemplate = {
  id: PlannedTemplateId;
  kinds: readonly CollectionKind[];
  channels: readonly QuizChannel[];
  /** Wording of the two answers of a boolean question. */
  booleanLabels?: BooleanLabels;
  /** Cheap check on the term's own fields, before any lookup. */
  eligible(term: QuizTerm): boolean;
  /** Null when the collection can't supply what the question needs. */
  build(term: QuizTerm, ctx: BuildContext): Promise<QuizQuestion | null>;
  /** A sentence on why the answer was right or wrong, from the question and what was answered. */
  feedback(question: QuizQuestion, passed: boolean, response: QuizResponse | null): string | null;
};
