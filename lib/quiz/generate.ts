import { generateObject } from "ai";
import { aiGenerationOptions, type AiObservabilityContext } from "@/lib/ai/observability";
import { createModel } from "@/lib/llm/model";
import type { LlmProvider } from "@/lib/llm/types";
import { buildQuiz } from "./build";
import type { DistractorSource } from "./distractors";
import { normalizeQuizQuestions } from "./normalize";
import type { AiQuizPlan, AiSlot } from "./plan-ai";
import { buildQuizPrompt } from "./generate-prompt";
import {
  buildQuizGenerationObjectSchema,
  buildQuizGenerationSchema,
  toQuizGenerationPayload,
  type QuizGenerationSlot,
} from "./schema";
import type { QuizQuestion } from "./types";

type GenerationPlan = [QuizGenerationSlot, ...QuizGenerationSlot[]];

function toGenerationPlan(slots: AiSlot[]): GenerationPlan {
  return slots.map(({ term, template }) => ({
    termId: term.id,
    type: template.ai?.interaction === "boolean" ? "true_false" : "multiple_choice",
    quote: template.ai?.writesQuote ?? false,
  })) as GenerationPlan;
}

async function requestQuestionsFromModel(input: {
  provider: LlmProvider;
  apiKey: string;
  slots: AiSlot[];
  observability?: AiObservabilityContext;
}): Promise<QuizQuestion[]> {
  const prompt = buildQuizPrompt(input.slots);
  const plan = toGenerationPlan(input.slots);
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
              schema: buildQuizGenerationObjectSchema(plan),
              prompt,
              providerOptions: { google: { structuredOutputs: true } },
              ...aiGenerationOptions(input.observability, "quiz_generation"),
            })
          ).object,
          plan,
        )
      : (
          await generateObject({
            model,
            schema: buildQuizGenerationSchema(plan),
            prompt,
            ...aiGenerationOptions(input.observability, "quiz_generation"),
          })
        ).object;

  return normalizeQuizQuestions(object, input.slots);
}

async function writeQuestions(input: {
  provider: LlmProvider;
  apiKey: string;
  slots: AiSlot[];
  observability?: AiObservabilityContext;
}): Promise<QuizQuestion[]> {
  if (input.slots.length === 0) return [];

  try {
    return await requestQuestionsFromModel(input);
  } catch (firstError) {
    try {
      return await requestQuestionsFromModel(input);
    } catch {
      if (firstError instanceof Error) throw firstError;
      throw new Error("Couldn't generate the quiz. Check your API key and try again.");
    }
  }
}

/**
 * The finished quiz for a plan, one question per term in the plan's order:
 * the ones built without the model, the ones the model wrote, and a simple
 * question for any term the model failed on, so the quiz keeps its length.
 */
export async function generateQuizQuestions(input: {
  provider: LlmProvider;
  apiKey: string;
  plan: AiQuizPlan;
  source: DistractorSource;
  observability?: AiObservabilityContext;
}): Promise<QuizQuestion[]> {
  const { plan, source } = input;
  if (plan.terms.length === 0) {
    throw new Error("No terms to generate a quiz for.");
  }

  const written = await writeQuestions({
    provider: input.provider,
    apiKey: input.apiKey,
    slots: plan.slots,
    observability: input.observability,
  });

  const byTermId = new Map(plan.built);
  for (const question of written) byTermId.set(question.termId, question);

  const missing = plan.terms.filter((term) => !byTermId.has(term.id));
  for (const question of await buildQuiz(missing, source, "web")) {
    byTermId.set(question.termId, question);
  }

  return plan.terms.flatMap((term) => byTermId.get(term.id) ?? []);
}
