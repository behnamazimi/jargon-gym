import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { getMyCreditState } from "./repository";

type Client = SupabaseClient<Database>;

function client(prices: { feature: string; credit_cost: number | null }[]) {
  return {
    rpc: () =>
      Promise.resolve({
        data: [{ enabled: true, total: 100, remaining: 40 }],
        error: null,
      }),
    from: () => ({ select: () => ({ in: () => Promise.resolve({ data: prices, error: null }) }) }),
  } as unknown as Client;
}

describe("getMyCreditState", () => {
  it("takes the prices from the feature rows", async () => {
    const state = await getMyCreditState(
      client([
        { feature: "story", credit_cost: 3 },
        { feature: "quiz", credit_cost: 2 },
      ]),
    );
    expect(state).toEqual({
      enabled: true,
      total: 100,
      remaining: 40,
      costs: { quizPerQuestion: 2, storyPerTerm: 3 },
    });
  });

  it("fails when a price is missing, so nothing is charged at a guessed price", async () => {
    await expect(getMyCreditState(client([{ feature: "quiz", credit_cost: 2 }]))).rejects.toThrow(
      "prices are not set",
    );
  });
});
