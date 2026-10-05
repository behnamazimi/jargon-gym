import type { CollectionKind } from "@/lib/terms/kinds";

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
  domainId: string;
  domainName: string;
};

/** What a question asks. Drives feedback copy and which kinds and channels
 *  can use it; how it is answered is the question's `interaction`. */
export type PlannedTemplateId =
  | "definition_to_term"
  | "term_to_meaning"
  | "masked_example"
  | "does_it_fit";

/** `free_*` are questions the AI model wrote in its own shape. */
export const QUIZ_TEMPLATE_IDS = [
  "definition_to_term",
  "term_to_meaning",
  "masked_example",
  "does_it_fit",
  "free_choice",
  "free_boolean",
] as const satisfies readonly (PlannedTemplateId | "free_choice" | "free_boolean")[];

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

export type QuizQuestion = QuizChoiceQuestion | QuizBooleanQuestion;

export type QuizResponse =
  | { interaction: "choice"; optionIds: string[] }
  | { interaction: "boolean"; value: boolean };

export type QuizAnswer = {
  termId: string;
  passed: boolean;
};
