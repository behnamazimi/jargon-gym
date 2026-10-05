import type { CollectionKind } from "@/lib/terms/kinds";
import type { QuizChannel, QuizQuestion, QuizResponse } from "../types";
import { definitionToTerm } from "./definition-to-term";
import { doesItFit } from "./does-it-fit";
import { maskedExample } from "./masked-example";
import { termToMeaning } from "./term-to-meaning";
import { typedCloze } from "./typed-cloze";
import { typedMeaningToWord } from "./typed-meaning-to-word";
import type { BooleanLabels, QuizTemplate } from "./types";

/** Adding a question type means adding its module and listing it here. */
const QUIZ_TEMPLATES: readonly QuizTemplate[] = [
  definitionToTerm,
  termToMeaning,
  maskedExample,
  doesItFit,
  typedCloze,
  typedMeaningToWord,
];

const DEFAULT_BOOLEAN_LABELS: BooleanLabels = { yes: "True", no: "False" };

export function templatesFor(kind: CollectionKind, channel: QuizChannel): QuizTemplate[] {
  return QUIZ_TEMPLATES.filter(
    (template) => template.kinds.includes(kind) && template.channels.includes(channel),
  );
}

function templateOf(question: QuizQuestion): QuizTemplate | undefined {
  return QUIZ_TEMPLATES.find((template) => template.id === question.template);
}

export function quizFeedbackLine(
  question: QuizQuestion,
  passed: boolean,
  response: QuizResponse | null = null,
): string | null {
  return templateOf(question)?.feedback(question, passed, response) ?? null;
}

export function booleanLabelsFor(question: QuizQuestion): BooleanLabels {
  return templateOf(question)?.booleanLabels ?? DEFAULT_BOOLEAN_LABELS;
}
