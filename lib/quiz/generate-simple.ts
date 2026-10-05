import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { buildQuiz } from "./build";
import { supabaseDistractorSource } from "./distractors-supabase";
import type { QuizQuestion, QuizTerm } from "./types";

/** A simple quiz: deterministic, no LLM calls. The question types come from
 *  each term's collection kind (see lib/quiz/templates). */
export function generateSimpleQuiz(
  terms: QuizTerm[],
  client: SupabaseClient<Database>,
): Promise<QuizQuestion[]> {
  return buildQuiz(terms, supabaseDistractorSource(client), "web");
}
