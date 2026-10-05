import { generateText } from "ai";
import { aiGenerationOptions, type AiObservabilityContext } from "@/lib/ai/observability";
import type { DomainLanguage } from "@/lib/terms/languages";
import { describeFailure } from "@/lib/ai-credits/failure-reason";
import { isKeyRejected, providerStatus } from "@/lib/llm/errors";
import { createModel } from "@/lib/llm/model";
import type { LlmProvider } from "@/lib/llm/types";
import { storyLength } from "./length";
import { parseStoryText } from "./markup";
import { StoryGenerationError } from "./errors";
import { normalizeStory } from "./normalize";
import { buildStoryPrompt } from "./prompt";
import type { StyleOption } from "./styles";
import type { CefrLevel, PieceLength, ReadingLevel, StorySegment, StoryTerm } from "./types";

export type StoryProviderErrorKind = "auth" | "rate-limit" | "timeout" | "other";

/** What the user is told, with the original failure kept as `cause`. */
export class StoryProviderError extends Error {
  constructor(
    message: string,
    readonly kind: StoryProviderErrorKind,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

// The Stories page is cut off at 60 seconds. Stopping earlier lets the failure
// be reported and the credits refunded instead of the request being killed.
const STORY_TIMEOUT_MS = 45_000;

type GenerateStoryInput = {
  provider: LlmProvider;
  apiKey: string;
  terms: StoryTerm[];
  collectionName: string;
  language: DomainLanguage;
  format: StyleOption;
  tone: StyleOption;
  readingLevel: ReadingLevel;
  cefrLevel: CefrLevel;
  pieceLength: PieceLength;
  outline: string | null;
  setting: string;
  recentTitles: string[];
  observability?: AiObservabilityContext;
};

type GeneratedStory = { title: string; segments: StorySegment[]; termIds: string[] };

function isRetryable(error: unknown): boolean {
  if (error instanceof StoryGenerationError) return true;
  const status = providerStatus(error);
  return status === undefined || status >= 500;
}

function toProviderError(error: unknown, timedOut: boolean): StoryProviderError {
  const cause = { cause: error };
  if (timedOut) {
    return new StoryProviderError("Writing the story took too long. Try again.", "timeout", cause);
  }
  if (isKeyRejected(error)) {
    return new StoryProviderError(
      "Your API key was rejected. Update it in Settings.",
      "auth",
      cause,
    );
  }
  if (providerStatus(error) === 429) {
    return new StoryProviderError(
      "Your provider is rate-limiting requests. Try again in a minute.",
      "rate-limit",
      cause,
    );
  }
  return new StoryProviderError("Couldn't write a story this time. Try again.", "other", cause);
}

// Plain text rather than a JSON object: in JSON output the model has been
// dropping the space after sentence-ending periods ("first.What").
async function requestStory(
  input: GenerateStoryInput,
  signal: AbortSignal,
): Promise<GeneratedStory> {
  const length = storyLength(input.pieceLength, input.cefrLevel, input.language);
  const { system, prompt } = buildStoryPrompt({ ...input, length });
  const { text } = await generateText({
    model: createModel(input.provider, input.apiKey),
    system,
    prompt,
    maxRetries: 0,
    abortSignal: signal,
    ...aiGenerationOptions(input.observability, "story_generation"),
  });
  return normalizeStory(parseStoryText(text, input.terms), input.terms, length);
}

function failed(input: GenerateStoryInput, error: unknown, deadline: AbortSignal) {
  console.error(`Story generation failed (${input.provider}):`, describeFailure(error));
  return toProviderError(error, deadline.aborted);
}

/** One retry, only for failures a second attempt can plausibly fix: a
 *  story that missed too many terms, a server error, or a network error.
 *  A rejected key, a rate limit, another client error or a timeout fails
 *  straight away. Both attempts share one time limit. */
export async function generateStory(input: GenerateStoryInput): Promise<GeneratedStory> {
  const deadline = AbortSignal.timeout(STORY_TIMEOUT_MS);
  try {
    return await requestStory(input, deadline);
  } catch (firstError) {
    if (!isRetryable(firstError) || deadline.aborted) throw failed(input, firstError, deadline);
    console.warn(
      `Story attempt failed, retrying (${input.provider}):`,
      describeFailure(firstError),
    );
    try {
      return await requestStory(input, deadline);
    } catch (secondError) {
      throw failed(input, secondError, deadline);
    }
  }
}
