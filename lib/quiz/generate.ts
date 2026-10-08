import { generateObject } from "ai";
import type { UsageTally } from "@/lib/ai-credits/usage-tally";
import { aiGenerationOptions, type AiObservabilityContext } from "@/lib/ai/observability";
import { isTransientFailure } from "@/lib/llm/errors";
import { createModel } from "@/lib/llm/model";
import type { LlmProvider } from "@/lib/llm/types";
import { buildQuiz } from "./build";
import type { DistractorSource } from "./distractors";
import { QuizTimeoutError } from "./failure";
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

// The Quiz page is cut off at 60 seconds. Stopping earlier lets the failure be
// reported and the credits refunded instead of the request being killed.
const QUIZ_TIMEOUT_MS = 45_000;

type ModelInput = {
  provider: LlmProvider;
  apiKey: string;
  slots: AiSlot[];
  observability?: AiObservabilityContext;
  onUsage?: UsageTally["add"];
  /** Fires when the time limit for writing the quiz is up. */
  signal: AbortSignal;
};

async function requestQuestionsFromModel(input: ModelInput): Promise<QuizQuestion[]> {
  const prompt = buildQuizPrompt(input.slots);
  const plan = toGenerationPlan(input.slots);
  const model = createModel(input.provider, input.apiKey);

  // Gemini's structured-output response_schema can't express the positional
  // tuple buildQuizGenerationSchema produces (its `items` field isn't
  // repeating), so Google gets an object-keyed variant of the same
  // per-slot-type schema instead — see buildQuizGenerationObjectSchema.
  let object;
  if (input.provider === "google") {
    const result = await generateObject({
      model,
      schema: buildQuizGenerationObjectSchema(plan),
      prompt,
      providerOptions: { google: { structuredOutputs: true } },
      maxRetries: 0,
      abortSignal: input.signal,
      ...aiGenerationOptions(input.observability, "quiz_generation"),
    });
    input.onUsage?.(result.usage);
    object = toQuizGenerationPayload(result.object, plan);
  } else {
    const result = await generateObject({
      model,
      schema: buildQuizGenerationSchema(plan),
      prompt,
      maxRetries: 0,
      abortSignal: input.signal,
      ...aiGenerationOptions(input.observability, "quiz_generation"),
    });
    input.onUsage?.(result.usage);
    object = result.object;
  }

  return normalizeQuizQuestions(object, input.slots);
}

/** One retry, only for a failure a second attempt can plausibly fix and only
 *  while time remains. Both attempts share one time limit. */
async function writeQuestions(input: Omit<ModelInput, "signal">): Promise<QuizQuestion[]> {
  if (input.slots.length === 0) return [];

  const deadline = AbortSignal.timeout(QUIZ_TIMEOUT_MS);
  const attempt = () => requestQuestionsFromModel({ ...input, signal: deadline });

  try {
    return await attempt();
  } catch (firstError) {
    if (deadline.aborted) throw new QuizTimeoutError({ cause: firstError });
    if (!isTransientFailure(firstError)) throw firstError;
    try {
      return await attempt();
    } catch (secondError) {
      if (deadline.aborted) throw new QuizTimeoutError({ cause: secondError });
      if (firstError instanceof Error) throw firstError;
      throw new Error("Couldn't generate the quiz. Try again.");
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
  onUsage?: UsageTally["add"];
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
    onUsage: input.onUsage,
  });

  const byTermId = new Map(plan.built);
  for (const question of written) byTermId.set(question.termId, question);

  const missing = plan.terms.filter((term) => !byTermId.has(term.id));
  for (const question of await buildQuiz(missing, source, "web")) {
    byTermId.set(question.termId, question);
  }

  return plan.terms.flatMap((term) => byTermId.get(term.id) ?? []);
}
