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

/** The fields the model writes for a question, before they are checked. */
export type AiRaw = {
  quote?: string;
  options?: { id: string; text: string }[];
  correctOptionIds?: string[];
  correctAnswer?: boolean;
};

/** How a template is written by the model in AI mode. */
type AiSpec = {
  interaction: "choice" | "boolean";
  /** Whether the model writes the quote (scenario or description) itself. */
  writesQuote: boolean;
  /** What to write, per collection kind. Sent only when the template is in the quiz. */
  guidance: Record<CollectionKind, string>;
  /** Turns the model's fields into the final question, or null when unusable. */
  finish(raw: AiRaw, term: QuizTerm): QuizQuestion | null;
};

export type QuizTemplate = {
  id: PlannedTemplateId;
  kinds: readonly CollectionKind[];
  channels: readonly QuizChannel[];
  /** Wording of the two answers of a boolean question. */
  booleanLabels?: BooleanLabels;
  /** Present when the model can write this template in AI mode. */
  ai?: AiSpec;
  /** Cheap check on the term's own fields, before any lookup. */
  eligible(term: QuizTerm): boolean;
  /** Null when the collection can't supply what the question needs. */
  build(term: QuizTerm, ctx: BuildContext): Promise<QuizQuestion | null>;
  /** A sentence on why the answer was right or wrong, from the question and what was answered. */
  feedback(question: QuizQuestion, passed: boolean, response: QuizResponse | null): string | null;
};
