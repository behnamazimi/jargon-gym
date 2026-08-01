import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { selectDistractors } from "./distractors";
import type { QuizQuestion, QuizTerm } from "./types";

type Client = SupabaseClient<Database>;

/**
 * Generate a simple quiz without AI - uses exact definitions and term names.
 * Each question shows the definition and asks user to pick the correct term.
 */
export async function generateSimpleQuiz(
  terms: QuizTerm[],
  client?: Client,
): Promise<QuizQuestion[]> {
  const supabase = client ?? (await createClient());
  const questions: QuizQuestion[] = [];

  for (const term of terms) {
    const distractors = await selectDistractors(supabase, term.id, terms, 3);

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
