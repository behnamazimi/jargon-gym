import { generateText } from "ai";
import type { DomainLanguage } from "@/lib/jargon/languages";
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

export type StoryProviderErrorKind = "auth" | "rate-limit" | "other";

export class StoryProviderError extends Error {
  constructor(
    message: string,
    readonly kind: StoryProviderErrorKind,
  ) {
    super(message);
  }
}

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
};

type GeneratedStory = { title: string; segments: StorySegment[]; termIds: string[] };

function isRetryable(error: unknown): boolean {
  if (error instanceof StoryGenerationError) return true;
  const status = providerStatus(error);
  return status === undefined || status >= 500;
}

function toProviderError(error: unknown): StoryProviderError {
  const status = providerStatus(error);
  if (isKeyRejected(error)) {
    return new StoryProviderError("Your API key was rejected. Update it in Settings.", "auth");
  }
  if (status === 429) {
    return new StoryProviderError(
      "Your provider is rate-limiting requests. Try again in a minute.",
      "rate-limit",
    );
  }
  return new StoryProviderError("Couldn't write a story this time. Try again.", "other");
}

// Plain text rather than a JSON object: in JSON output the model has been
// dropping the space after sentence-ending periods ("first.What").
async function requestStory(input: GenerateStoryInput): Promise<GeneratedStory> {
  const length = storyLength(input.pieceLength, input.cefrLevel, input.language);
  const { system, prompt } = buildStoryPrompt({ ...input, length });
  const { text } = await generateText({
    model: createModel(input.provider, input.apiKey),
    system,
    prompt,
    maxRetries: 0,
  });
  return normalizeStory(parseStoryText(text, input.terms), input.terms, length);
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
