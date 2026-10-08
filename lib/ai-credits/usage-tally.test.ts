import { describe, expect, it } from "vitest";
import { createUsageTally } from "./usage-tally";

const usage = (input: number, output: number, reasoning?: number) =>
  ({
    inputTokens: input,
    outputTokens: output,
    outputTokenDetails: { textTokens: undefined, reasoningTokens: reasoning },
  }) as never;

describe("createUsageTally", () => {
  it("adds up every call, retries included", () => {
    const tally = createUsageTally();
    tally.add(usage(2000, 600, 400));
    tally.add(usage(2000, 300));
    expect(tally.read()).toEqual({
      inputTokens: 4000,
      outputTokens: 900,
      reasoningTokens: 400,
      calls: 2,
    });
  });

  it("ignores a call with no usage and reads zero when nothing was added", () => {
    const tally = createUsageTally();
    tally.add(undefined);
    expect(tally.read()).toEqual({ inputTokens: 0, outputTokens: 0, reasoningTokens: 0, calls: 0 });
  });
});
