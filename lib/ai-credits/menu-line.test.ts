import { describe, expect, it } from "vitest";
import { aiCreditsLine, toAiCreditsLoad, type AiCreditsLoad } from "./menu-line";

const idle: AiCreditsLoad = { status: "idle", remaining: null };
const ready = (remaining: number): AiCreditsLoad => ({ status: "ready", remaining });

describe("aiCreditsLine", () => {
  it("shows nothing when credits aren't offered", () => {
    expect(aiCreditsLine("hidden", idle)).toBeNull();
    expect(aiCreditsLine("hidden", ready(50))).toBeNull();
  });

  it("says a user on their own key is using it", () => {
    expect(aiCreditsLine("own", idle)).toEqual({ label: "AI: your own key", tone: "muted" });
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

  it("hides the row when credits turn out to be off or the lookup failed", () => {
    expect(aiCreditsLine("credits", { status: "hidden", remaining: null })).toBeNull();
  });
});

describe("toAiCreditsLoad", () => {
  it("turns a balance into a ready state, including an empty one", () => {
    expect(toAiCreditsLoad({ remaining: 62 })).toEqual({ status: "ready", remaining: 62 });
    expect(toAiCreditsLoad({ remaining: 0 })).toEqual({ status: "ready", remaining: 0 });
  });

  it("hides the row when there is no result", () => {
    expect(toAiCreditsLoad(null)).toEqual({ status: "hidden", remaining: null });
  });
});
