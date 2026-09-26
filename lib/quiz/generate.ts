import { generateObject } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createModel } from "@/lib/llm/model";
import type { LlmProvider } from "@/lib/llm/types";
import type { Database } from "@/lib/supabase/database.types";
import { TRUE_FALSE_MAX_SHARE } from "./mix-ratios";
import { normalizeQuizQuestions } from "./normalize";
import { buildQuizPrompt, buildRemainderPlan } from "./generate-prompt";
import {
  buildQuizGenerationObjectSchema,
  buildQuizGenerationSchema,
  toQuizGenerationPayload,
  type QuizGenerationSlot,
} from "./schema";
import type { QuizQuestion, QuizTerm } from "./types";

async function requestQuizFromModel(input: {
  provider: LlmProvider;
  apiKey: string;
  terms: QuizTerm[];
  plan: [QuizGenerationSlot, ...QuizGenerationSlot[]];
}): Promise<QuizQuestion[]> {
  const prompt = buildQuizPrompt(input.terms, input.plan);
  const model = createModel(input.provider, input.apiKey);

  // Gemini's structured-output response_schema can't express the positional
  // tuple buildQuizGenerationSchema produces (its `items` field isn't
  // repeating), so Google gets an object-keyed variant of the same
  // per-slot-type schema instead — see buildQuizGenerationObjectSchema.
  const object =
    input.provider === "google"
      ? toQuizGenerationPayload(
          (
            await generateObject({
              model,
              schema: buildQuizGenerationObjectSchema(input.plan),
              prompt,
              providerOptions: { google: { structuredOutputs: true } },
            })
          ).object,
          input.plan,
        )
      : (await generateObject({ model, schema: buildQuizGenerationSchema(input.plan), prompt }))
          .object;

  return normalizeQuizQuestions(object, input.terms);
}

/** Generate questions for the given terms. Callers must pass the final sampled set only. */
export async function generateQuizQuestions(input: {
  provider: LlmProvider;
  apiKey: string;
  terms: QuizTerm[];
  client: SupabaseClient<Database>;
}): Promise<QuizQuestion[]> {
  if (input.terms.length === 0) {
    throw new Error("No terms to generate a quiz for.");
  }

  const maxTrueFalse = Math.floor(input.terms.length * TRUE_FALSE_MAX_SHARE);
  const plan = buildRemainderPlan(input.terms, maxTrueFalse) as [
    QuizGenerationSlot,
    ...QuizGenerationSlot[],
  ];
  const requestInput = { ...input, plan };

  let generated: QuizQuestion[];
  try {
    generated = await requestQuizFromModel(requestInput);
  } catch (firstError) {
    try {
      generated = await requestQuizFromModel(requestInput);
    } catch {
      if (firstError instanceof Error) throw firstError;
      throw new Error("Couldn't generate the quiz. Check your API key and try again.");
    }
  }

  const generatedByTermId = new Map(generated.map((question) => [question.termId, question]));
  const questions = input.terms
    .map((term) => generatedByTermId.get(term.id))
    .filter((question): question is QuizQuestion => Boolean(question));

  if (questions.length === 0) {
    throw new Error("Could not build a valid quiz from the model response.");
  }

  return questions;
}
