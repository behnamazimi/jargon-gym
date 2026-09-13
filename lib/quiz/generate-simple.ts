import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { selectDistractorsFromDomain } from "./distractors";
import {
  buildIllustrationQuestions,
  ILLUSTRATION_QUESTION_LINE,
  type IllustrationPick,
} from "./illustration";
import type { QuizQuestion, QuizTerm } from "./types";

type Client = SupabaseClient<Database>;

const MCQ_DISTRACTOR_COUNT = 3;

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

function buildIllustrationQuestion(term: QuizTerm, picked: IllustrationPick): QuizQuestion {
  return {
    type: "multiple_choice",
    termId: term.id,
    prompt: `${ILLUSTRATION_QUESTION_LINE}\n${picked.scenarioText}`,
    options: picked.options,
    correctOptionIds: [picked.correctOptionId],
  };
}

/** One term's full question-building decision: illustration MCQ if the term
 *  has an example/anti_example, else the term-guess definition MCQ.
 *  Independent per term — no shared state, so every call can run
 *  concurrently. */
async function buildQuestionForTerm(
  term: QuizTerm,
  client: Client,
  illustration: Map<string, IllustrationPick>,
): Promise<QuizQuestion> {
  const picked = illustration.get(term.id);
  if (picked) return buildIllustrationQuestion(term, picked);

  return buildMcqQuestion(term, client);
}

/**
 * Generate a simple quiz without AI - deterministic, no LLM calls. Mixes two
 * question flavors: illustration multiple_choice ("What does this
 * illustrate?", for terms with example/anti_example) and definition
 * multiple_choice (definition -> pick the term) for everything else. Every
 * term's question is built concurrently — none of the per-term work depends
 * on another term.
 */
export async function generateSimpleQuiz(
  terms: QuizTerm[],
  client: Client,
): Promise<QuizQuestion[]> {
  const illustration = await buildIllustrationQuestions(terms, client);

  return Promise.all(terms.map((term) => buildQuestionForTerm(term, client, illustration)));
}
