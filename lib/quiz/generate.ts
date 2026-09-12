import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LlmProvider } from "@/lib/llm/types";
import type { Database } from "@/lib/supabase/database.types";
import {
  assignExampleJudgmentQuestions,
  buildExampleJudgmentQuestionLine,
} from "./example-judgment";
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

const MODEL_BY_PROVIDER: Record<LlmProvider, string> = {
  google: "gemini-2.5-flash",
  anthropic: "claude-3-5-haiku-latest",
};

function createModel(provider: LlmProvider, apiKey: string) {
  if (provider === "google") {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(MODEL_BY_PROVIDER.google);
  }

  const anthropic = createAnthropic({ apiKey });
  return anthropic(MODEL_BY_PROVIDER.anthropic);
}

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
  // Example-judgment questions are built deterministically — same source of
  // truth as the non-AI quiz path (lib/quiz/example-judgment.ts) — so the
  // model is only ever asked to produce the two plain shapes below.
  const maxTrueFalse = Math.floor(input.terms.length * TRUE_FALSE_MAX_SHARE);
  const exampleJudgment = await assignExampleJudgmentQuestions(
    input.terms,
    input.client,
    maxTrueFalse,
  );
  const remainderTerms = input.terms.filter((term) => !exampleJudgment.has(term.id));

  const judgmentQuestions = new Map<string, QuizQuestion>();
  for (const term of input.terms) {
    const pick = exampleJudgment.get(term.id);
    if (!pick) continue;
    judgmentQuestions.set(term.id, {
      type: "true_false",
      termId: term.id,
      prompt: `${buildExampleJudgmentQuestionLine(term.term)}\n${pick.text}`,
      correctAnswer: pick.correctAnswer,
    });
  }

  let generatedQuestions = new Map<string, QuizQuestion>();
  if (remainderTerms.length > 0) {
    const trueFalseBudget = maxTrueFalse - exampleJudgment.size;
    const plan = buildRemainderPlan(remainderTerms, trueFalseBudget) as [
      QuizGenerationSlot,
      ...QuizGenerationSlot[],
    ];
    const requestInput = { ...input, terms: remainderTerms, plan };

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
    generatedQuestions = new Map(generated.map((question) => [question.termId, question]));
  }

  const questions = input.terms
    .map((term) => judgmentQuestions.get(term.id) ?? generatedQuestions.get(term.id))
    .filter((question): question is QuizQuestion => Boolean(question));

  if (questions.length === 0) {
    throw new Error("Could not build a valid quiz from the model response.");
  }

  return questions;
}
