import { APICallError, generateText, RetryError } from "ai";
import type { DomainLanguage } from "@/lib/jargon/languages";
import { createModel } from "@/lib/llm/model";
import type { LlmProvider } from "@/lib/llm/types";
import { parseStoryText } from "./markup";
import { normalizeStory, StoryGenerationError } from "./normalize";
import { buildStoryPrompt } from "./prompt";
import type { StyleOption } from "./styles";
import type { CefrLevel, ReadingLevel, StorySegment, StoryTerm } from "./types";

export class StoryProviderError extends Error {}

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
  outline: string | null;
};

type GeneratedStory = { title: string; segments: StorySegment[]; termIds: string[] };

function statusOf(error: unknown): number | undefined {
  const inner = RetryError.isInstance(error) ? error.lastError : error;
  return APICallError.isInstance(inner) ? inner.statusCode : undefined;
}

function isRetryable(error: unknown): boolean {
  if (error instanceof StoryGenerationError) return true;
  const status = statusOf(error);
  return status === undefined || status >= 500;
}

function toProviderError(error: unknown): StoryProviderError {
  const status = statusOf(error);
  if (status === 401 || status === 403) {
    return new StoryProviderError("Your API key was rejected. Update it in Settings.");
  }
  if (status === 429) {
    return new StoryProviderError(
      "Your provider is rate-limiting requests. Try again in a minute.",
    );
  }
  return new StoryProviderError("Couldn't write a story this time. Try again.");
}

// Plain text rather than a JSON object: in JSON output the model has been
// dropping the space after sentence-ending periods ("first.What").
async function requestStory(input: GenerateStoryInput): Promise<GeneratedStory> {
  const { text } = await generateText({
    model: createModel(input.provider, input.apiKey),
    prompt: buildStoryPrompt(input),
    maxRetries: 0,
  });
  return normalizeStory(parseStoryText(text, input.terms), input.terms);
}

/** One retry, only for failures a second attempt can plausibly fix: a
 *  story that missed too many terms, a server error, or a network error.
 *  A rejected key or a rate limit fails straight away. */
export async function generateStory(input: GenerateStoryInput): Promise<GeneratedStory> {
  try {
    return await requestStory(input);
  } catch (firstError) {
    if (!isRetryable(firstError)) throw toProviderError(firstError);
    try {
      return await requestStory(input);
    } catch (secondError) {
      console.error("Story generation failed:", secondError);
      throw toProviderError(secondError);
    }
  }
}
