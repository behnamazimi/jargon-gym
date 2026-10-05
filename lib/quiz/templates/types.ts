import type { CollectionKind } from "@/lib/terms/kinds";
import type { DistractorSource } from "../distractors";
import type { Rng } from "../random";
import type { PlannedTemplateId, QuizChannel, QuizQuestion, QuizTerm } from "../types";

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
  /** One sentence on why the answer was right or wrong, from the question alone. */
  feedback(question: QuizQuestion, passed: boolean): string | null;
};
