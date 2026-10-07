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
  pieceLength: "medium" as const,
  outline: null,
  setting: "a rainy weekend at home",
  recentTitles: [],
};

const FILLER = Array.from({ length: 90 }, (_, index) => `word${index}`).join(" ");

const GOOD_TEXT = `Title

[[idempotency|1]] [[sharding|2]] [[backpressure|3]] ${FILLER}`;

const MISSING_TERMS_TEXT = `Title

${FILLER}`;

function apiError(statusCode: number, message = `HTTP ${statusCode}`) {
  return new APICallError({
    message,
    url: "https://example.test",
    requestBodyValues: {},
    statusCode,
  });
}

const mockedGenerate = vi.mocked(generateText);

function resolveWith(text: string) {
  return Promise.resolve({ text }) as unknown as ReturnType<typeof generateText>;
}

let logError: ReturnType<typeof vi.spyOn>;
let logWarning: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockedGenerate.mockReset();
  logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  logWarning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  logError.mockClear();
  logWarning.mockClear();
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
    await expect(generateStory(INPUT)).rejects.toMatchObject({
      kind: "auth",
      message: expect.stringMatching(/Try again/),
    });
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it("does not retry a rate limit", async () => {
    mockedGenerate.mockRejectedValue(apiError(429));
    await expect(generateStory(INPUT)).rejects.toMatchObject({
      kind: "rate-limit",
      message: expect.stringMatching(/rate-limiting/),
    });
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it("gives up after the second failure", async () => {
    mockedGenerate.mockReturnValue(resolveWith(MISSING_TERMS_TEXT));
    await expect(generateStory(INPUT)).rejects.toBeInstanceOf(StoryProviderError);
    expect(mockedGenerate).toHaveBeenCalledTimes(2);
  });

  it("does not retry other client errors, and keeps the provider's reason", async () => {
    const providerFailure = apiError(404, "This model is no longer available to new users");
    mockedGenerate.mockRejectedValue(providerFailure);
    await expect(generateStory(INPUT)).rejects.toMatchObject({
      kind: "other",
      cause: providerFailure,
    });
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      "Story generation failed (anthropic):",
      "Provider error 404: This model is no longer available to new users",
    );
  });

  it("logs a failed first attempt that a retry then recovers from", async () => {
    mockedGenerate.mockRejectedValueOnce(apiError(503)).mockReturnValueOnce(resolveWith(GOOD_TEXT));
    await generateStory(INPUT);
    expect(logWarning).toHaveBeenCalledWith(
      "Story attempt failed, retrying (anthropic):",
      "Provider error 503: HTTP 503",
    );
    expect(logError).not.toHaveBeenCalled();
  });

  it("logs and wraps an error that isn't from the provider", async () => {
    mockedGenerate.mockReturnValue(resolveWith(MISSING_TERMS_TEXT));
    await expect(generateStory(INPUT)).rejects.toMatchObject({ kind: "other" });
    expect(logError).toHaveBeenCalledWith(
      "Story generation failed (anthropic):",
      expect.stringMatching(/^StoryGenerationError:/),
    );
  });

  it("stops without retrying once the time limit has passed", async () => {
    vi.spyOn(AbortSignal, "timeout").mockReturnValueOnce(AbortSignal.abort());
    mockedGenerate.mockRejectedValue(new DOMException("aborted", "TimeoutError"));
    await expect(generateStory(INPUT)).rejects.toMatchObject({ kind: "timeout" });
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it("gives the model the time limit as its abort signal", async () => {
    mockedGenerate.mockReturnValueOnce(resolveWith(GOOD_TEXT));
    await generateStory(INPUT);
    expect(mockedGenerate.mock.calls[0]![0].abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("sends the fixed rules as the system prompt and the story details as the prompt", async () => {
    mockedGenerate.mockReturnValueOnce(resolveWith(GOOD_TEXT));
    await generateStory(INPUT);
    const call = mockedGenerate.mock.calls[0]![0];
    expect(call.system).toContain("Each option in a request has one job");
    expect(call.prompt).toContain("1. Idempotency: d");
  });

  it("retries once when a term marker comes back broken", async () => {
    mockedGenerate
      .mockReturnValueOnce(resolveWith(`Title\n\n[idempotency|1] ${FILLER}`))
      .mockReturnValueOnce(resolveWith(GOOD_TEXT));
    await expect(generateStory(INPUT)).resolves.toBeTruthy();
    expect(mockedGenerate).toHaveBeenCalledTimes(2);
  });
});
