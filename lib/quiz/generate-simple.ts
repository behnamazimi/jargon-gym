import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { selectDistractorsFromDomain } from "./distractors";
import type { QuizQuestion, QuizTerm } from "./types";

type Client = SupabaseClient<Database>;

/**
 * Generate a simple quiz without AI - uses exact definitions and term names.
 * Each question shows the definition and asks user to pick the correct term.
 */
export async function generateSimpleQuiz(
  terms: QuizTerm[],
  client: Client,
): Promise<QuizQuestion[]> {
  const questions: QuizQuestion[] = [];

  for (const term of terms) {
    const distractors = await selectDistractorsFromDomain(client, term.id, term.domainId, 3);

    const correctOption = { id: term.id, text: term.term };
    const distractorOptions = distractors.map((d) => ({ id: d.id, text: d.term }));
    const shuffledOptions = [correctOption, ...distractorOptions].sort(() => Math.random() - 0.5);

    questions.push({
      type: "multiple_choice",
      termId: term.id,
      prompt: term.definition.trim(),
      options: shuffledOptions,
      correctOptionIds: [term.id],
    });
  }

  return questions;
}
