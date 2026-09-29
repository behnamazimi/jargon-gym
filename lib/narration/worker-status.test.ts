import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { describeCron, getCronStatus, recordWorkerTick } from "./worker-status";

type Client = SupabaseClient<Database>;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("recordWorkerTick", () => {
  it("upserts one row per worker and caller with the secret label", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const admin = { from: () => ({ upsert }) } as unknown as Client;
    await recordWorkerTick(admin, { source: "cron" });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ worker: "narration-sync", source: "cron", last_secret: "ai" }),
      { onConflict: "worker,source" },
    );
    const row = upsert.mock.calls[0]?.[0] as { last_tick_at: string };
    expect(Math.abs(Date.now() - Date.parse(row.last_tick_at))).toBeLessThan(5000);
  });

  it("never fails the tick, whether the write errors or throws", async () => {
    const failing = {
      from: () => ({ upsert: () => Promise.resolve({ error: new Error("no table") }) }),
    } as unknown as Client;
    const throwing = {
      from: () => ({
        upsert: () => {
          throw new Error("fetch failed");
        },
      }),
    } as unknown as Client;
    await expect(recordWorkerTick(failing, { source: "app" })).resolves.toBeUndefined();
    await expect(recordWorkerTick(throwing, { source: "app" })).resolves.toBeUndefined();
  });
});

describe("getCronStatus", () => {
  it("reads only the cron row, and shows none when the read fails", async () => {
    const eqs: unknown[][] = [];
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      select: () => chain,
      eq: (column: string, value: string) => {
        eqs.push([column, value]);
        return chain;
      },
      maybeSingle: () =>
        Promise.resolve({
          data: { last_tick_at: "2026-09-29T10:00:00Z" },
          error: null,
        }),
    });
    const client = { from: () => chain } as unknown as Client;
    expect(await getCronStatus(client)).toEqual({ lastTickAt: "2026-09-29T10:00:00Z" });
    expect(eqs).toEqual([
      ["worker", "narration-sync"],
      ["source", "cron"],
    ]);

    const broken = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: new Error("x") }),
            }),
          }),
        }),
      }),
    } as unknown as Client;
    expect(await getCronStatus(broken)).toBeNull();
  });
});

describe("getCronStatus when the read throws", () => {
  it("shows none instead of breaking the page", async () => {
    const client = {
      from: () => {
        throw new Error("fetch failed");
      },
    } as unknown as Client;
    expect(await getCronStatus(client)).toBeNull();
  });
});

describe("describeCron", () => {
  const now = Date.parse("2026-09-29T10:10:00Z");

  it("says nothing when the cron has never called and no sync needs it", () => {
    expect(describeCron(null, false, now)).toBeNull();
  });

  it("warns when a sync needs the cron and it has never called", () => {
    expect(describeCron(null, true, now)).toMatchObject({ warning: true });
  });

  it("says how long ago the cron last called", () => {
    const fresh = describeCron({ lastTickAt: "2026-09-29T10:09:00Z" }, false, now);
    expect(fresh?.text).toMatch(/1 min ago/);
    expect(fresh?.warning).toBe(false);
  });

  it("ignores a timestamp it can't read", () => {
    expect(describeCron({ lastTickAt: "not a date" }, true, now)).toBeNull();
  });

  it("warns when the cron went quiet while a sync needs it", () => {
    const status = { lastTickAt: "2026-09-29T09:50:00Z", secret: "ai" };
    expect(describeCron(status, true, now)?.warning).toBe(true);
    expect(describeCron(status, false, now)?.warning).toBe(false);
  });
});
