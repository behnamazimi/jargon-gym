import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { selectDistractorsFromDomain } from "./distractors";
import {
  assignExampleJudgmentQuestions,
  buildExampleJudgmentQuestionLine,
  type ExampleJudgmentPick,
} from "./example-judgment";
import { TRUE_FALSE_MAX_SHARE } from "./mix-ratios";
import type { QuizQuestion, QuizTerm } from "./types";

type Client = SupabaseClient<Database>;

const MCQ_DISTRACTOR_COUNT = 3;
const PLAIN_TRUE_FALSE_DISTRACTOR_COUNT = 1;

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

function buildExampleJudgmentQuestion(term: QuizTerm, picked: ExampleJudgmentPick): QuizQuestion {
  return {
    type: "true_false",
    termId: term.id,
    prompt: `${buildExampleJudgmentQuestionLine(term.term)}\n${picked.text}`,
    correctAnswer: picked.correctAnswer,
  };
}

/** One term's full question-building decision tree: example-judgment first,
 *  else plain true/false (falling back to multiple_choice if no distractor
 *  is available for the false case), else multiple_choice. Independent per
 *  term — no shared state, so every call can run concurrently. */
async function buildQuestionForTerm(
  term: QuizTerm,
  client: Client,
  exampleJudgment: Map<string, ExampleJudgmentPick>,
  plainTrueFalseIds: Set<string>,
  makeTrueByTermId: Map<string, boolean>,
): Promise<QuizQuestion> {
  const picked = exampleJudgment.get(term.id);
  if (picked) return buildExampleJudgmentQuestion(term, picked);

  if (plainTrueFalseIds.has(term.id)) {
    const question = await buildPlainTrueFalseQuestion(
      term,
      client,
      makeTrueByTermId.get(term.id) ?? false,
    );
    if (question) return question;
  }

  return buildMcqQuestion(term, client);
}

/**
 * Generate a simple quiz without AI - deterministic, no LLM calls.
 * Mixes three question flavors: example-judgment true/false (for terms with
 * example/anti_example), plain definition-matching true/false, and
 * multiple_choice (definition -> pick the term). Every term's question is
 * built concurrently — none of the per-term work depends on another term.
 */
export async function generateSimpleQuiz(
  terms: QuizTerm[],
  client: Client,
): Promise<QuizQuestion[]> {
  // Same TRUE_FALSE_MAX_SHARE budget generate.ts (the AI path) enforces:
  // example-judgment spends first, and whatever's left of the cap is the
  // most plain true/false questions can add, so the two flavors combined
  // never exceed the quiz-wide cap.
  const maxTrueFalse = Math.floor(terms.length * TRUE_FALSE_MAX_SHARE);
  const exampleJudgment = await assignExampleJudgmentQuestions(terms, client, maxTrueFalse);

  const remainingTerms = terms.filter((term) => !exampleJudgment.has(term.id));
  const plainTrueFalseTarget = Math.max(
    0,
    Math.min(maxTrueFalse - exampleJudgment.size, remainingTerms.length),
  );
  const plainTrueFalseIds = new Set(
    [...remainingTerms]
      .sort(() => Math.random() - 0.5)
      .slice(0, plainTrueFalseTarget)
      .map((term) => term.id),
  );

  // makeTrue alternates across the plainTrueFalseIds subset, in terms'
  // original order — precomputed here (synchronously, no await) so the
  // question-building below has no shared mutable state and can run
  // every term concurrently instead of one at a time.
  const makeTrueByTermId = new Map<string, boolean>();
  let plainTrueFalseIndex = 0;
  for (const term of terms) {
    if (plainTrueFalseIds.has(term.id)) {
      makeTrueByTermId.set(term.id, plainTrueFalseIndex % 2 === 0);
      plainTrueFalseIndex += 1;
    }
  }

  return Promise.all(
    terms.map((term) =>
      buildQuestionForTerm(term, client, exampleJudgment, plainTrueFalseIds, makeTrueByTermId),
    ),
  );
}
