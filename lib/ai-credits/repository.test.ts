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

function client(
  prices: PriceRow[],
  topUp: { available: boolean; amount: number; reason: string | null } = {
    available: true,
    amount: 30,
    reason: null,
  },
) {
  return {
    rpc: (name: string) =>
      Promise.resolve({
        data:
          name === "my_self_topup_state" ? [topUp] : [{ enabled: true, total: 100, remaining: 40 }],
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
      topUp: { available: true, amount: 30 },
    });
  });

  it("says why the free top-up isn't available", async () => {
    const taken = { available: false, amount: 30, reason: "already-today" };
    expect((await getMyCreditState(client(seeded, taken)))?.topUp).toEqual({
      available: false,
      reason: "already-today",
      amount: 30,
    });
    const unknown = { available: false, amount: 0, reason: "off" };
    expect((await getMyCreditState(client(seeded, unknown)))?.topUp).toMatchObject({
      available: false,
      reason: "off",
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
