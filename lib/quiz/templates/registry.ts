import type { CollectionKind } from "@/lib/terms/kinds";
import type { QuizChannel, QuizQuestion } from "../types";
import { definitionToTerm } from "./definition-to-term";
import { doesItFit } from "./does-it-fit";
import { maskedExample } from "./masked-example";
import { termToMeaning } from "./term-to-meaning";
import type { BooleanLabels, QuizTemplate } from "./types";

/** Adding a question type means adding its module and listing it here. */
const QUIZ_TEMPLATES: readonly QuizTemplate[] = [
  definitionToTerm,
  termToMeaning,
  maskedExample,
  doesItFit,
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

export function quizFeedbackLine(question: QuizQuestion, passed: boolean): string | null {
  return templateOf(question)?.feedback(question, passed) ?? null;
}

export function booleanLabelsFor(question: QuizQuestion): BooleanLabels {
  return templateOf(question)?.booleanLabels ?? DEFAULT_BOOLEAN_LABELS;
}
