import { describe, expect, it } from "vitest";
import { aiCreditsLine, toAiCreditsLoad, type AiCreditsLoad } from "./menu-line";

const idle: AiCreditsLoad = { status: "idle", remaining: null };
const ready = (remaining: number): AiCreditsLoad => ({ status: "ready", remaining });

describe("aiCreditsLine", () => {
  it("shows nothing when credits aren't offered", () => {
    expect(aiCreditsLine("hidden", idle)).toBeNull();
    expect(aiCreditsLine("hidden", ready(50))).toBeNull();
  });

  it("holds a placeholder, not a link, until the balance loads", () => {
    expect(aiCreditsLine("credits", idle)).toEqual({
      label: "Checking AI credits…",
      tone: "muted",
      pending: true,
    });
    expect(aiCreditsLine("credits", { status: "loading", remaining: null })?.label).toBe(
      "Checking AI credits…",
    );
  });

  it("keeps showing the last balance while it refreshes", () => {
    expect(aiCreditsLine("credits", { status: "loading", remaining: 12 })?.label).toBe(
      "12 credits left",
    );
  });

  it("shows the balance in plain text", () => {
    expect(aiCreditsLine("credits", ready(62))).toEqual({
      label: "62 credits left",
      tone: "muted",
    });
    expect(aiCreditsLine("credits", ready(1))?.label).toBe("1 credit left");
  });

  it("flags an empty balance", () => {
    expect(aiCreditsLine("credits", ready(0))).toEqual({
      label: "AI credits used up",
      tone: "error",
    });
  });

  it("mentions free credits when the top-up would work", () => {
    expect(
      aiCreditsLine("credits", { status: "ready", remaining: 5, freeCreditsAvailable: true })
        ?.label,
    ).toBe("5 credits left · free credits available");
    expect(
      aiCreditsLine("credits", { status: "ready", remaining: 0, freeCreditsAvailable: true }),
    ).toEqual({ label: "AI credits used up · free credits available", tone: "error" });
  });

  it("hides the row when credits turn out to be off or the lookup failed", () => {
    expect(aiCreditsLine("credits", { status: "hidden", remaining: null })).toBeNull();
  });
});

describe("toAiCreditsLoad", () => {
  it("turns a balance into a ready state, including an empty one", () => {
    const off = { available: false, reason: "balance", amount: 30 } as const;
    expect(toAiCreditsLoad({ remaining: 62, topUp: off })).toEqual({
      status: "ready",
      remaining: 62,
      freeCreditsAvailable: false,
    });
    expect(toAiCreditsLoad({ remaining: 0, topUp: { available: true, amount: 30 } })).toEqual({
      status: "ready",
      remaining: 0,
      freeCreditsAvailable: true,
    });
  });

  it("hides the row when there is no result", () => {
    expect(toAiCreditsLoad(null)).toEqual({ status: "hidden", remaining: null });
  });
});
