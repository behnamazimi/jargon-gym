import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { selectDistractorsFromDomain } from "./distractors";
import {
  assignExampleJudgmentQuestions,
  buildExampleJudgmentQuestionLine,
} from "./example-judgment";
import { MCQ_SHARE_OF_REMAINDER } from "./mix-ratios";
import type { QuizQuestion, QuizTerm } from "./types";

type Client = SupabaseClient<Database>;

const MCQ_DISTRACTOR_COUNT = 3;
const PLAIN_TRUE_FALSE_DISTRACTOR_COUNT = 1;
const PLAIN_TRUE_FALSE_SHARE_OF_REMAINDER = 1 - MCQ_SHARE_OF_REMAINDER;

async function buildMcqQuestion(term: QuizTerm, client: Client): Promise<QuizQuestion> {
  const distractors = await selectDistractorsFromDomain(
    client,
    term.id,
    term.domainId,
    MCQ_DISTRACTOR_COUNT,
  );

  const correctOption = { id: term.id, text: term.term };
  const distractorOptions = distractors.map((d) => ({ id: d.id, text: d.term }));
  const shuffledOptions = [correctOption, ...distractorOptions].sort(() => Math.random() - 0.5);

  return {
    type: "multiple_choice",
    termId: term.id,
    prompt: term.definition.trim(),
    options: shuffledOptions,
    correctOptionIds: [term.id],
  };
}

async function buildPlainTrueFalseQuestion(
  term: QuizTerm,
  client: Client,
  makeTrue: boolean,
): Promise<QuizQuestion | null> {
  if (makeTrue) {
    return {
      type: "true_false",
      termId: term.id,
      prompt: `"${term.definition.trim()}" is the definition of "${term.term}".`,
      correctAnswer: true,
    };
  }

  const [distractor] = await selectDistractorsFromDomain(
    client,
    term.id,
    term.domainId,
    PLAIN_TRUE_FALSE_DISTRACTOR_COUNT,
  );
  if (!distractor) return null;

  return {
    type: "true_false",
    termId: term.id,
    prompt: `"${term.definition.trim()}" is the definition of "${distractor.term}".`,
    correctAnswer: false,
  };
}

/**
 * Generate a simple quiz without AI - deterministic, no LLM calls.
 * Mixes three question flavors: example-judgment true/false (for terms with
 * example/anti_example), plain definition-matching true/false, and
 * multiple_choice (definition -> pick the term).
 */
export async function generateSimpleQuiz(
  terms: QuizTerm[],
  client: Client,
): Promise<QuizQuestion[]> {
  const exampleJudgment = assignExampleJudgmentQuestions(terms);

  const remainingTerms = terms.filter((term) => !exampleJudgment.has(term.id));
  const plainTrueFalseTarget = Math.round(
    remainingTerms.length * PLAIN_TRUE_FALSE_SHARE_OF_REMAINDER,
  );
  const plainTrueFalseIds = new Set(
    [...remainingTerms]
      .sort(() => Math.random() - 0.5)
      .slice(0, plainTrueFalseTarget)
      .map((term) => term.id),
  );

  const questions: QuizQuestion[] = [];
  let plainTrueFalseIndex = 0;

  for (const term of terms) {
    const picked = exampleJudgment.get(term.id);
    if (picked) {
      questions.push({
        type: "true_false",
        termId: term.id,
        prompt: `${buildExampleJudgmentQuestionLine(term.term)}\n${picked.text}`,
        correctAnswer: picked.correctAnswer,
      });
      continue;
    }

    if (plainTrueFalseIds.has(term.id)) {
      const makeTrue = plainTrueFalseIndex % 2 === 0;
      plainTrueFalseIndex += 1;
      const question = await buildPlainTrueFalseQuestion(term, client, makeTrue);
      if (question) {
        questions.push(question);
        continue;
      }
    }

    questions.push(await buildMcqQuestion(term, client));
  }

  return questions;
}
