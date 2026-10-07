import { describe, expect, it } from "vitest";
import { buildAiHubRows, type AiSettingsRow } from "./ai-hub";

const ok = () => ({ ok: true }) as const;

const row = (feature: string, overrides: Partial<AiSettingsRow> = {}): AiSettingsRow => ({
  feature,
  enabled: true,
  credit_cost: null,
  daily_cap: null,
  ...overrides,
});

const settings = [
  row("quiz", { credit_cost: 1 }),
  row("story", { credit_cost: 3, enabled: false }),
  row("narration_term"),
  row("narration_story", { daily_cap: 20 }),
];

const rowsById = (rows: ReturnType<typeof buildAiHubRows>) => new Map(rows.map((r) => [r.id, r]));

describe("buildAiHubRows", () => {
  it("has one row per manageable feature, narration as one", () => {
    expect(buildAiHubRows(settings, ok).map((r) => r.id)).toEqual(["quiz", "story", "narration"]);
  });

  it("shows switch state and the price or limit", () => {
    const rows = rowsById(buildAiHubRows(settings, ok));
    expect(rows.get("quiz")).toMatchObject({ state: "on", limit: "1 credit per question" });
    expect(rows.get("story")).toMatchObject({ state: "off", limit: "3 credits per term" });
    expect(rows.get("narration")).toMatchObject({
      state: "on",
      limit: "Terms: no limit. Stories: 20 a day.",
    });
  });

  it("calls narration mixed when its two features disagree", () => {
    const drifted = settings.map((s) =>
      s.feature === "narration_story" ? { ...s, enabled: false } : s,
    );
    expect(rowsById(buildAiHubRows(drifted, ok)).get("narration")?.state).toBe("mixed");
    const off = settings.map((s) =>
      s.feature.startsWith("narration") ? { ...s, enabled: false } : s,
    );
    expect(rowsById(buildAiHubRows(off, ok)).get("narration")?.state).toBe("off");
  });

  it("says unknown, not off, when settings can't be read or a row is missing", () => {
    const unreadable = buildAiHubRows(null, ok);
    expect(unreadable.filter((r) => r.state === "unknown").map((r) => r.id)).toEqual([
      "quiz",
      "story",
      "narration",
    ]);
    const partial = buildAiHubRows(
      settings.filter((s) => s.feature !== "narration_term"),
      ok,
    );
    expect(rowsById(partial).get("narration")?.state).toBe("unknown");
  });

  it("shows a free feature's price instead of a dash", () => {
    const free = settings.map((s) => (s.feature === "quiz" ? { ...s, credit_cost: 0 } : s));
    expect(rowsById(buildAiHubRows(free, ok)).get("quiz")?.limit).toBe("0 credits per question");
  });

  it("carries the health note of what each feature needs", () => {
    const rows = rowsById(
      buildAiHubRows(settings, (feature) =>
        feature === "narration_term" ? { ok: false, note: "Missing ELEVENLABS_API_KEY." } : ok(),
      ),
    );
    expect(rows.get("narration")?.healthNote).toBe("Missing ELEVENLABS_API_KEY.");
    expect(rows.get("quiz")?.healthNote).toBeNull();
  });
});
