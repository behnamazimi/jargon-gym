import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  APP_AUDIT_ACTIONS,
  DB_AUDIT_ACTIONS,
  describeAudit,
  KNOWN_AUDIT_ACTIONS,
} from "./audit-labels";

describe("audit labels", () => {
  it("cover exactly the actions the database writes", () => {
    const sql = readFileSync("supabase/migrations/20260930110000_admin_rpcs.sql", "utf8");
    const written = [...sql.matchAll(/_admin_audit_insert\(\s*'([a-z_]+)'/g)].map((m) => m[1]);
    expect(new Set(written)).toEqual(new Set(Object.keys(DB_AUDIT_ACTIONS)));
  });

  it("start with app. for app-written actions and never for database ones", () => {
    for (const action of Object.keys(APP_AUDIT_ACTIONS))
      expect(action.startsWith("app.")).toBe(true);
    for (const action of Object.keys(DB_AUDIT_ACTIONS))
      expect(action.startsWith("app.")).toBe(false);
    expect(KNOWN_AUDIT_ACTIONS).toHaveLength(
      Object.keys(APP_AUDIT_ACTIONS).length + Object.keys(DB_AUDIT_ACTIONS).length,
    );
  });
});

describe("describeAudit", () => {
  it("describes known actions from their details", () => {
    expect(
      describeAudit("app.collection_status", { from: "builtin", to: "published", slug: "cooking" }),
    ).toEqual({
      label: "Collection status changed",
      summary: "builtin to published, /j/cooking",
    });
    expect(describeAudit("grant_ai_credits", { amount: 25, note: "beta" }).summary).toBe(
      '25 credits, "beta"',
    );
    expect(describeAudit("set_narration_caps", { term_cap: null, story_cap: 20 }).summary).toBe(
      "Terms no limit, stories 20",
    );
    expect(
      describeAudit("set_ai_credit_settings", {
        old: {},
        new: { default_allowance: 90, monthly_refill: 20, quiz_cost: 3, story_cost: 4 },
      }).summary,
    ).toBe("Allowance 90, monthly 20, quiz 3, story 4");
  });

  it("never trusts the shape of details", () => {
    for (const details of [null, "x", 5, [], [1], { from: { deep: 1 }, to: [1] }]) {
      expect(() => describeAudit("app.collection_status", details as never)).not.toThrow();
    }
    expect(describeAudit("app.collection_status", null).summary).toBe("? to ?");
  });

  it("cuts long text", () => {
    const summary = describeAudit("grant_ai_credits", { amount: 1, note: "x".repeat(500) }).summary;
    expect(summary?.length).toBeLessThan(120);
  });

  it("shows unknown actions as their raw name", () => {
    expect(describeAudit("something_new", {})).toEqual({ label: "something_new", summary: null });
  });
});
