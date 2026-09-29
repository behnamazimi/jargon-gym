import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { isNarrationEnabled } from "./feature";

function client(result: { data: { enabled: boolean } | null; error: Error | null }) {
  return {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }),
    }),
  } as unknown as SupabaseClient<Database>;
}

describe("isNarrationEnabled", () => {
  it("reads the switch", async () => {
    expect(await isNarrationEnabled(client({ data: { enabled: true }, error: null }))).toBe(true);
    expect(await isNarrationEnabled(client({ data: { enabled: false }, error: null }))).toBe(false);
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
