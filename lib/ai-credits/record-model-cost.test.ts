import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordModelCost } from "./record-model-cost";
import { createUsageTally } from "./usage-tally";

const rpc = vi.fn();
const admin = { rpc } as never;

beforeEach(() => {
  vi.resetAllMocks();
  rpc.mockResolvedValue({ error: null });
});

describe("recordModelCost", () => {
  it("records the tokens and the cost of the calls made", async () => {
    const tally = createUsageTally();
    tally.add({
      inputTokens: 2000,
      outputTokens: 650,
      outputTokenDetails: { reasoningTokens: 500 },
    } as never);
    await recordModelCost(admin, 7, "google", tally);
    expect(rpc).toHaveBeenCalledWith(
      "record_ai_credit_cost",
      expect.objectContaining({
        p_spend_id: 7,
        p_provider: "google",
        p_input_tokens: 2000,
        p_output_tokens: 650,
        p_reasoning_tokens: 500,
        p_calls: 1,
      }),
    );
  });

  it("records nothing when no usage was reported", async () => {
    await recordModelCost(admin, 7, "google", createUsageTally());
    expect(rpc).not.toHaveBeenCalled();
  });

  it("never throws when the write fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    rpc.mockResolvedValue({ error: new Error("db down") });
    const tally = createUsageTally();
    tally.add({ inputTokens: 1, outputTokens: 1 } as never);
    await expect(recordModelCost(admin, 7, "google", tally)).resolves.toBeUndefined();
  });
});
