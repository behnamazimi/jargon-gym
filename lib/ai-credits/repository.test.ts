import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { getMyCreditState } from "./repository";
import { testCosts } from "./test-costs";

type Client = SupabaseClient<Database>;

type PriceRow = {
  feature: string;
  base_credits: number;
  credits_per_unit: number;
  unit_size: number;
  effective_from: string;
};

const row = (feature: string, base: number, per: number, size = 1, from = "2026-10-18") => ({
  feature,
  base_credits: base,
  credits_per_unit: per,
  unit_size: size,
  effective_from: from,
});

function client(prices: PriceRow[]) {
  return {
    rpc: () =>
      Promise.resolve({
        data: [{ enabled: true, total: 100, remaining: 40 }],
        error: null,
      }),
    from: () => ({
      select: () => ({
        lte: () => ({ order: () => Promise.resolve({ data: prices, error: null }) }),
      }),
    }),
  } as unknown as Client;
}

const seeded = [row("quiz", 0, 1), row("story", 2, 0.5), row("narration_story", 0, 7.5, 1000)];

describe("getMyCreditState", () => {
  it("takes the prices from the price rows", async () => {
    expect(await getMyCreditState(client(seeded))).toEqual({
      enabled: true,
      total: 100,
      remaining: 40,
      costs: testCosts,
    });
  });

  it("uses the newest row for a feature", async () => {
    const state = await getMyCreditState(client([row("story", 4, 1, 1, "2027-01-01"), ...seeded]));
    expect(state?.costs.story).toEqual({ baseCredits: 4, creditsPerUnit: 1, unitSize: 1 });
  });

  it("fails when a price is missing, so nothing is charged at a guessed price", async () => {
    await expect(getMyCreditState(client([row("quiz", 0, 1)]))).rejects.toThrow(
      "prices are not set",
    );
  });
});
