import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { countRecentGenerations, recordUsage } from "./usage";

type Client = SupabaseClient<Database>;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("recordUsage", () => {
  it("writes one event for the person and feature", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const admin = { from: () => ({ insert }) } as unknown as Client;
    await recordUsage(admin, {
      userId: "u1",
      feature: "narration_term",
      units: 120,
      outcome: "ok",
      provider: "murf",
    });
    expect(insert).toHaveBeenCalledWith({
      user_id: "u1",
      feature: "narration_term",
      units: 120,
      outcome: "ok",
      provider: "murf",
    });
  });

  it("never fails the request when the call itself throws", async () => {
    const admin = {
      from: () => ({
        insert: () => {
          throw new Error("fetch failed");
        },
      }),
    } as unknown as Client;
    await expect(
      recordUsage(admin, { userId: "u1", feature: "narration_story", units: 5, outcome: "ok" }),
    ).resolves.toBeUndefined();
  });

  it("never fails the request when the write fails", async () => {
    const admin = {
      from: () => ({ insert: () => Promise.resolve({ error: new Error("db down") }) }),
    } as unknown as Client;
    await expect(
      recordUsage(admin, { userId: "u1", feature: "narration_story", units: 0, outcome: "failed" }),
    ).resolves.toBeUndefined();
  });
});

describe("countRecentGenerations", () => {
  function clientReturning(result: { count: number | null; error: unknown }) {
    const chain: Record<string, unknown> = {};
    const seen: unknown[][] = [];
    Object.assign(chain, {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        seen.push([column, value]);
        return chain;
      },
      gte: (column: string, since: string) => {
        seen.push([column, Date.now() - Date.parse(since) > 23.9 * 3600_000]);
        return Promise.resolve(result);
      },
    });
    return { admin: { from: () => chain } as unknown as Client, seen };
  }

  it("counts this person's calls for the feature", async () => {
    const { admin, seen } = clientReturning({ count: 7, error: null });
    expect(await countRecentGenerations(admin, "u1", "narration_term")).toBe(7);
    expect(seen).toEqual([
      ["user_id", "u1"],
      ["feature", "narration_term"],
      ["created_at", true],
    ]);
  });

  it("counts none while the usage table isn't in the database yet", async () => {
    const { admin } = clientReturning({ count: null, error: { code: "42P01" } });
    expect(await countRecentGenerations(admin, "u1", "narration_term")).toBe(0);
  });

  it("does not hide other errors", async () => {
    const { admin } = clientReturning({ count: null, error: new Error("permission denied") });
    await expect(countRecentGenerations(admin, "u1", "narration_term")).rejects.toThrow(
      "permission denied",
    );
  });
});
