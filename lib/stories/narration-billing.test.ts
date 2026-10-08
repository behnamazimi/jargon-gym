import { beforeEach, describe, expect, it, vi } from "vitest";

const reserveCredits = vi.fn();
const refundCredits = vi.fn();
const recordCreditCost = vi.fn();

vi.mock("@/lib/ai-credits/repository", () => ({ reserveCredits, refundCredits, recordCreditCost }));

const { chargeStoryNarration } = await import("./narration-billing");

const admin = {} as never;
const ok = { status: "ok", remaining: 40, ledgerId: 9, credits: 4 };

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("chargeStoryNarration", () => {
  it("reserves narration credits by the number of characters", async () => {
    reserveCredits.mockResolvedValue(ok);
    const decision = await chargeStoryNarration(admin, "u1")({ characters: 524 });
    expect(decision.allowed).toBe(true);
    expect(reserveCredits).toHaveBeenCalledWith(admin, "u1", "narration_story", 524);
  });

  it("refuses when the balance is too low", async () => {
    reserveCredits.mockResolvedValue({ status: "insufficient", remaining: 1, credits: 4 });
    expect(await chargeStoryNarration(admin, "u1")({ characters: 524 })).toEqual({
      allowed: false,
      reason: "insufficient",
    });
  });

  it("reports unavailable when credits or the feature are off", async () => {
    reserveCredits.mockResolvedValue({ status: "disabled", remaining: 40, credits: 4 });
    expect(await chargeStoryNarration(admin, "u1")({ characters: 524 })).toEqual({
      allowed: false,
      reason: "unavailable",
    });
  });

  it("refunds the reservation when the clip is not made", async () => {
    reserveCredits.mockResolvedValue(ok);
    const decision = await chargeStoryNarration(admin, "u1")({ characters: 524 });
    if (!decision.allowed) throw new Error("expected a charge");
    await decision.onFailure?.();
    expect(refundCredits).toHaveBeenCalledWith(admin, 9, expect.stringContaining("Narration"));
  });

  it("records what a Murf clip cost", async () => {
    reserveCredits.mockResolvedValue(ok);
    const decision = await chargeStoryNarration(admin, "u1")({ characters: 524 });
    if (!decision.allowed) throw new Error("expected a charge");
    await decision.onSuccess?.([{ provider: "murf", units: 524, outcome: "ok" }]);
    expect(recordCreditCost).toHaveBeenCalledWith(admin, 9, {
      provider: "murf",
      model: "speech",
      characters: 524,
      costMicroUsd: 5240,
      calls: 1,
    });
  });

  it("records nothing when the provider's rate is unknown", async () => {
    reserveCredits.mockResolvedValue(ok);
    const decision = await chargeStoryNarration(admin, "u1")({ characters: 524 });
    if (!decision.allowed) throw new Error("expected a charge");
    await decision.onSuccess?.([
      { provider: "murf", units: 524, outcome: "failed" },
      { provider: "elevenlabs", units: 524, outcome: "ok" },
    ]);
    expect(recordCreditCost).not.toHaveBeenCalled();
  });
});
