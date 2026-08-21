import { describe, expect, it } from "vitest";
import { effectiveStalenessDecayHours, RANKING, staleReasonThresholdHours } from "./weights";

describe("effectiveStalenessDecayHours", () => {
  it("keeps today's flat τ at the baseline streak of 1", () => {
    expect(effectiveStalenessDecayHours(1, 36)).toBe(36);
  });

  it("keeps the flat τ for struggling/negative streaks", () => {
    expect(effectiveStalenessDecayHours(-3, 24)).toBe(24);
  });

  it("ramps more slowly as the streak grows past baseline", () => {
    const base = 36;
    const tau2 = effectiveStalenessDecayHours(2, base);
    const tau3 = effectiveStalenessDecayHours(3, base);
    const tau5 = effectiveStalenessDecayHours(5, base);

    expect(tau2).toBeGreaterThan(base);
    expect(tau3).toBeGreaterThan(tau2);
    expect(tau5).toBeGreaterThan(tau3);
  });

  it("caps at the same streak masteredCooldownHours caps at", () => {
    const base = 36;
    expect(effectiveStalenessDecayHours(5, base)).toBe(effectiveStalenessDecayHours(10, base));
  });
});

describe("staleReasonThresholdHours", () => {
  it("derives Read from the 7-day cap and Review/Quiz from their base τ", () => {
    expect(staleReasonThresholdHours("read")).toBe(RANKING.formula.stalenessCapHours);
    expect(staleReasonThresholdHours("review")).toBe(RANKING.stalenessDecayHours.review);
    expect(staleReasonThresholdHours("quiz")).toBe(RANKING.stalenessDecayHours.quiz);
  });
});
