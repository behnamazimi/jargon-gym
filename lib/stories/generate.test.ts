import { APICallError, generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateStory, StoryProviderError } from "./generate";
import { findFormat, findTone } from "./styles";

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: vi.fn(),
}));

const TERMS = [
  { id: "t1", term: "Idempotency", definition: "d" },
  { id: "t2", term: "Sharding", definition: "d" },
  { id: "t3", term: "Backpressure", definition: "d" },
];

const INPUT = {
  provider: "anthropic" as const,
  apiKey: "sk-test",
  terms: TERMS,
  collectionName: "Systems",
  language: "en" as const,
  format: findFormat("email")!,
  tone: findTone("neutral")!,
  readingLevel: "professional" as const,
  cefrLevel: "B2" as const,
  outline: null,
  setting: "a rainy weekend at home",
  recentTitles: [],
};

const FILLER = Array.from({ length: 90 }, (_, index) => `word${index}`).join(" ");

const GOOD_TEXT = `Title

[[idempotency|1]] [[sharding|2]] [[backpressure|3]] ${FILLER}`;

const MISSING_TERMS_TEXT = `Title

${FILLER}`;

function apiError(statusCode: number) {
  return new APICallError({
    message: `HTTP ${statusCode}`,
    url: "https://example.test",
    requestBodyValues: {},
    statusCode,
  });
}

const mockedGenerate = vi.mocked(generateText);

function resolveWith(text: string) {
  return Promise.resolve({ text }) as unknown as ReturnType<typeof generateText>;
}

beforeEach(() => {
  mockedGenerate.mockReset();
});

describe("generateStory", () => {
  it("returns the normalized story", async () => {
    mockedGenerate.mockReturnValueOnce(resolveWith(GOOD_TEXT));
    const story = await generateStory(INPUT);
    expect(story.termIds).toEqual(["t1", "t2", "t3"]);
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it("retries once when the story misses terms", async () => {
    mockedGenerate
      .mockReturnValueOnce(resolveWith(MISSING_TERMS_TEXT))
      .mockReturnValueOnce(resolveWith(GOOD_TEXT));
    const story = await generateStory(INPUT);
    expect(story.termIds).toHaveLength(3);
    expect(mockedGenerate).toHaveBeenCalledTimes(2);
  });

  it("retries once on a server error", async () => {
    mockedGenerate.mockRejectedValueOnce(apiError(503)).mockReturnValueOnce(resolveWith(GOOD_TEXT));
    await expect(generateStory(INPUT)).resolves.toBeTruthy();
    expect(mockedGenerate).toHaveBeenCalledTimes(2);
  });

  it("does not retry a rejected key", async () => {
    mockedGenerate.mockRejectedValue(apiError(401));
    await expect(generateStory(INPUT)).rejects.toThrow(/API key was rejected/);
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it("does not retry a rate limit", async () => {
    mockedGenerate.mockRejectedValue(apiError(429));
    await expect(generateStory(INPUT)).rejects.toThrow(/rate-limiting/);
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it("gives up after the second failure", async () => {
    mockedGenerate.mockReturnValue(resolveWith(MISSING_TERMS_TEXT));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(generateStory(INPUT)).rejects.toBeInstanceOf(StoryProviderError);
    expect(mockedGenerate).toHaveBeenCalledTimes(2);
  });
});
