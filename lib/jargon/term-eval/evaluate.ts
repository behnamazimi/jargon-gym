import { experimental_evaluate } from "ai";
import {
  FIELD_CONTRACT,
  FIT_LEVELS,
  FIT_TOP,
  TERM_FIELDS,
  fieldText,
  presentTerm,
  type EvalTerm,
  type TermField,
} from "./rubric";

const MODEL = "typesafe-ai/jev";

const PLAIN_THRESHOLD = 0.8;

const FIT_WEIGHT: Record<TermField, number> = {
  term: 0.5,
  category: 0.5,
  definition: 2,
  example: 1,
  mental_model: 1,
  discussion: 1,
  anti_example: 1,
  controversy: 1,
};

const PLAIN_ID = "entry_plain";

function fitId(field: TermField): string {
  return `${field}_fit`;
}

type ScoreQuestion = {
  type: "score";
  instructions: { question: string; scope: string };
  criteria: [string, string, string];
};

type BooleanQuestion = {
  type: "boolean";
  instructions: string;
  criteria: { true: string; false: string };
};

function questionsFor(term: EvalTerm): Record<string, ScoreQuestion | BooleanQuestion> {
  const questions: Record<string, ScoreQuestion | BooleanQuestion> = {
    [PLAIN_ID]: {
      type: "boolean",
      instructions:
        "Could a newcomer learn what `term.term` is from the populated fields in `term`, in plain language, without usage, debate, or a near-miss blurring that meaning?",
      criteria: {
        true: "The entry states what the term is, plainly, and a newcomer would not be confused about the meaning.",
        false:
          "The entry does not plainly say what the term is, or mixes in material that blurs the meaning.",
      },
    },
  };

  for (const field of TERM_FIELDS) {
    if (!fieldText(term, field)) continue;
    questions[fitId(field)] = {
      type: "score",
      instructions: {
        question: `How well does \`term.${field}\` do the job in \`field_contract.${field}.job\`?`,
        scope: "Judge only that text. A true statement that does another field's job scores low.",
      },
      criteria: FIT_LEVELS[field],
    };
  }

  return questions;
}

function readScore(answers: Record<string, unknown>, id: string): number {
  const answer = answers[id];
  if (
    !answer ||
    typeof answer !== "object" ||
    !("type" in answer) ||
    answer.type !== "score" ||
    !("score" in answer) ||
    typeof answer.score !== "number"
  ) {
    throw new Error(`Missing score answer for ${id}.`);
  }
  return answer.score;
}

function readProbability(answers: Record<string, unknown>, id: string): number {
  const answer = answers[id];
  if (
    !answer ||
    typeof answer !== "object" ||
    !("type" in answer) ||
    answer.type !== "boolean" ||
    !("probability" in answer) ||
    typeof answer.probability !== "number"
  ) {
    throw new Error(`Missing boolean answer for ${id}.`);
  }
  return answer.probability;
}

export function schemaFitFromAnswers(term: EvalTerm, answers: Record<string, unknown>): number {
  let weighted = 0;
  let weight = 0;
  for (const field of TERM_FIELDS) {
    if (!fieldText(term, field)) continue;
    const fieldWeight = FIT_WEIGHT[field];
    weighted += (readScore(answers, fitId(field)) / FIT_TOP) * fieldWeight;
    weight += fieldWeight;
  }
  return weight === 0 ? 0 : weighted / weight;
}

export async function evaluateTermEntry(
  term: EvalTerm,
): Promise<{ schemaFit: number; plain: boolean }> {
  const result = await experimental_evaluate({
    model: MODEL,
    state: {
      domain: term.domainName,
      field_contract: FIELD_CONTRACT,
      term: presentTerm(term),
    },
    questions: questionsFor(term),
  });

  const answers = result.answers as Record<string, unknown>;
  return {
    schemaFit: schemaFitFromAnswers(term, answers),
    plain: readProbability(answers, PLAIN_ID) >= PLAIN_THRESHOLD,
  };
}
