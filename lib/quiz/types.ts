import type { CollectionKind } from "@/lib/terms/kinds";
import type { DomainLanguage } from "@/lib/terms/languages";
import type { TermCard } from "@/lib/terms/term-card";

export type QuizQuestionStyle = "ai" | "simple";

export type QuizChannel = "web" | "telegram";

export type QuizTerm = {
  id: string;
  term: string;
  definition: string;
  example: string | null;
  antiExample: string | null;
  category: string | null;
  kind: CollectionKind;
  language: DomainLanguage;
  /** How well the learner already recognises the term; absent when unknown. */
  recognition?: TermCard["recognition"];
  domainId: string;
  domainName: string;
};

/** What a question asks. Drives feedback copy and which kinds and channels
 *  can use it; how it is answered is the question's `interaction`. */
export type PlannedTemplateId =
  | "definition_to_term"
  | "term_to_meaning"
  | "masked_example"
  | "does_it_fit"
  | "typed_cloze"
  | "typed_meaning_to_word";

export const QUIZ_TEMPLATE_IDS = [
  "definition_to_term",
  "term_to_meaning",
  "masked_example",
  "does_it_fit",
  "typed_cloze",
  "typed_meaning_to_word",
] as const satisfies readonly PlannedTemplateId[];

type QuizTemplateId = (typeof QUIZ_TEMPLATE_IDS)[number];

type QuizQuestionBase = {
  template: QuizTemplateId;
  termId: string;
  prompt: string;
  /** A scenario shown apart from the prompt, such as an example sentence. */
  quote?: string;
};

export type QuizChoiceQuestion = QuizQuestionBase & {
  interaction: "choice";
  options: { id: string; text: string }[];
  correctOptionIds: string[];
};

export type QuizBooleanQuestion = QuizQuestionBase & {
  interaction: "boolean";
  correctAnswer: boolean;
};

export type QuizTextQuestion = QuizQuestionBase & {
  interaction: "text";
  /** Typed answers that count as right; the first is the one shown. */
  acceptedAnswers: string[];
  language: DomainLanguage;
  /** Extra help shown under the quote, such as the meaning of a blanked word. */
  hint?: string;
};

export type QuizQuestion = QuizChoiceQuestion | QuizBooleanQuestion | QuizTextQuestion;

export type QuizResponse =
  | { interaction: "choice"; optionIds: string[] }
  | { interaction: "boolean"; value: boolean }
  | { interaction: "text"; text: string };

export type QuizAnswer = {
  termId: string;
  passed: boolean;
};
