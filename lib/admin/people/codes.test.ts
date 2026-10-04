import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { listSharedCodes } from "./codes";

function clientReturning(result: { data: unknown; error: unknown }) {
  return { rpc: async () => result } as unknown as SupabaseClient<Database>;
}

describe("listSharedCodes", () => {
  it("maps the database rows", async () => {
    const rows = await listSharedCodes(
      clientReturning({
        error: null,
        data: [
          {
            id: "1",
            code: "LAUNCH50",
            label: "Newsletter",
            max_uses: 50,
            use_count: 12,
            expires_at: "2026-11-01T23:59:59Z",
            status: "active",
          },
        ],
      }),
    );
    expect(rows).toEqual([
      {
        id: "1",
        code: "LAUNCH50",
        label: "Newsletter",
        maxUses: 50,
        useCount: 12,
        expiresAt: "2026-11-01T23:59:59Z",
        status: "active",
      },
    ]);
  });

  it("treats an unknown status as paused, so it never looks usable", async () => {
    const [row] = await listSharedCodes(
      clientReturning({
        error: null,
        data: [
          {
            id: "1",
            code: "X",
            label: "x",
            max_uses: 2,
            use_count: 0,
            expires_at: null,
            status: "mystery",
          },
        ],
      }),
    );
    expect(row.status).toBe("paused");
  });

  it("throws the database error", async () => {
    await expect(
      listSharedCodes(clientReturning({ data: null, error: new Error("nope") })),
    ).rejects.toThrow("nope");
  });
});
