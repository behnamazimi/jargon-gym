import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEATURE_IDS, FEATURES, isBillable } from "./registry";

describe("feature registry", () => {
  it("gives every feature a unit and a plain description of what leaves the app", () => {
    for (const id of FEATURE_IDS) {
      expect(FEATURES[id].unit).not.toBe("");
      expect(FEATURES[id].sends).not.toBe("");
    }
  });

  it("bills story narration but never term narration", () => {
    expect(isBillable("narration_term")).toBe(false);
    expect(isBillable("narration_story")).toBe(true);
    expect(isBillable("quiz")).toBe(true);
  });

  it("matches the features the migration seeds, less the one later dropped", () => {
    const sql = readFileSync("supabase/migrations/20260929170000_ai_feature_settings.sql", "utf8");
    const seeded = [...sql.matchAll(/(?:select|values \() *'([a-z_]+)', (?:true|false|s\.)/g)]
      .map((match) => match[1])
      .filter((feature) => feature !== "new_feature" && feature !== "term_evaluation");
    expect(new Set(seeded)).toEqual(new Set(FEATURE_IDS));
  });
});
