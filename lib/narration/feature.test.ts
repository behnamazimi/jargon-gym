import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { isNarrationEnabled } from "./feature";

const asked: unknown[][] = [];

function client(result: { data: { enabled: boolean } | null; error: Error | null }) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: (column: string, value: string) => {
          asked.push([table, column, value]);
          return { maybeSingle: () => Promise.resolve(result) };
        },
      }),
    }),
  } as unknown as SupabaseClient<Database>;
}

describe("isNarrationEnabled", () => {
  it("reads the switch", async () => {
    expect(await isNarrationEnabled(client({ data: { enabled: true }, error: null }))).toBe(true);
    expect(await isNarrationEnabled(client({ data: { enabled: false }, error: null }))).toBe(false);
  });

  it("reads the term narration row of the feature settings", async () => {
    asked.length = 0;
    await isNarrationEnabled(client({ data: { enabled: true }, error: null }));
    expect(asked).toEqual([["ai_feature_settings", "feature", "narration_term"]]);
  });

  it("treats a missing row as off", async () => {
    expect(await isNarrationEnabled(client({ data: null, error: null }))).toBe(false);
  });

  it("does not hide a read error", async () => {
    await expect(
      isNarrationEnabled(client({ data: null, error: new Error("boom") })),
    ).rejects.toThrow("boom");
  });
});
