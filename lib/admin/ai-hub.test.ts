import { describe, expect, it } from "vitest";
import { buildAiHubRows, type AiSettingsRow } from "./ai-hub";

const ok = () => ({ ok: true }) as const;

const row = (feature: string, overrides: Partial<AiSettingsRow> = {}): AiSettingsRow => ({
  feature,
  enabled: true,
  daily_cap: null,
  ...overrides,
});

const settings = [
  row("quiz"),
  row("story", { enabled: false }),
  row("narration_term"),
  row("narration_story", { daily_cap: 20 }),
];

const prices = [
  { feature: "quiz", base_credits: 0, credits_per_unit: 1, unit_size: 1 },
  { feature: "story", base_credits: 2, credits_per_unit: 0.5, unit_size: 1 },
  { feature: "narration_story", base_credits: 0, credits_per_unit: 7.5, unit_size: 1000 },
];

const rowsById = (rows: ReturnType<typeof buildAiHubRows>) => new Map(rows.map((r) => [r.id, r]));

describe("buildAiHubRows", () => {
  it("has one row per manageable feature, narration as one", () => {
    expect(buildAiHubRows(settings, ok, prices).map((r) => r.id)).toEqual([
      "quiz",
      "story",
      "narration",
    ]);
  });

  it("shows switch state and the price or limit", () => {
    const rows = rowsById(buildAiHubRows(settings, ok, prices));
    expect(rows.get("quiz")).toMatchObject({ state: "on", limit: "1 credit per question" });
    expect(rows.get("story")).toMatchObject({ state: "off", limit: "2 credits + 0.5 per term" });
    expect(rows.get("narration")).toMatchObject({
      state: "on",
      limit: "Terms: no limit. Stories: 20 a day, 7.5 credits per 1,000 characters.",
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

  it("shows a dash when a price can't be read", () => {
    expect(rowsById(buildAiHubRows(settings, ok, null)).get("quiz")?.limit).toBe("—");
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
