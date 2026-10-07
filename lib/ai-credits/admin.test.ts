import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import {
  getAiCreditSettingsForAdmin,
  getAiCreditSummaryForAdmin,
  listAiCreditFailureReasonsForAdmin,
  listAiCreditUsageForAdmin,
} from "./admin";

type Client = SupabaseClient<Database>;

function rpcClient(result: { data: unknown; error: Error | null }) {
  const calls: { name: string; args: unknown }[] = [];
  const client = {
    rpc: (name: string, args: unknown) => {
      calls.push({ name, args });
      return Promise.resolve(result);
    },
  } as unknown as Client;
  return { client, calls };
}

function settingsClient(prices: { feature: string; credit_cost: number | null }[]) {
  return {
    from: (table: string) => ({
      select: () =>
        table === "ai_feature_settings"
          ? { in: () => Promise.resolve({ data: prices, error: null }) }
          : {
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      enabled: true,
                      default_allowance: 100,
                      monthly_refill: 30,
                      self_topup_amount: 30,
                    },
                    error: null,
                  }),
              }),
            },
    }),
  } as unknown as Client;
}

describe("getAiCreditSettingsForAdmin", () => {
  it("maps the settings row and takes the prices from the feature rows", async () => {
    const client = settingsClient([
      { feature: "quiz", credit_cost: 1 },
      { feature: "story", credit_cost: 2 },
    ]);

    expect(await getAiCreditSettingsForAdmin(client)).toEqual({
      enabled: true,
      defaultAllowance: 100,
      monthlyRefill: 30,
      quizCreditsPerQuestion: 1,
      storyCreditsPerTerm: 2,
      selfTopupAmount: 30,
    });
  });

  it("fails when a price is missing instead of guessing one", async () => {
    const client = settingsClient([{ feature: "quiz", credit_cost: 1 }]);
    await expect(getAiCreditSettingsForAdmin(client)).rejects.toThrow("prices are not set");
  });
});

describe("listAiCreditUsageForAdmin", () => {
  it("maps usage rows and asks for the most recent 200", async () => {
    const { client, calls } = rpcClient({
      data: [
        {
          user_id: "u1",
          email: "a@example.com",
          spent: 5,
          granted: 25,
          remaining: 150,
          last_activity: "2026-09-29T10:00:00Z",
        },
      ],
      error: null,
    });

    expect(await listAiCreditUsageForAdmin(client)).toEqual([
      {
        userId: "u1",
        email: "a@example.com",
        spent: 5,
        granted: 25,
        remaining: 150,
        lastActivity: "2026-09-29T10:00:00Z",
      },
    ]);
    expect(calls).toEqual([{ name: "admin_ai_credit_usage", args: { p_limit: 200 } }]);
  });

  it("returns an empty list for an empty ledger", async () => {
    const { client } = rpcClient({ data: null, error: null });
    expect(await listAiCreditUsageForAdmin(client)).toEqual([]);
  });

  it("throws the database error", async () => {
    const { client } = rpcClient({ data: null, error: new Error("nope") });
    await expect(listAiCreditUsageForAdmin(client)).rejects.toThrow("nope");
  });
});

describe("getAiCreditSummaryForAdmin", () => {
  it("maps the summary row", async () => {
    const { client } = rpcClient({
      data: [
        {
          total_users: 10,
          users_with_use: 4,
          users_exhausted: 1,
          credits_spent: 90,
          spends_24h: 12,
          refunds_24h: 3,
          refund_users_24h: 2,
        },
      ],
      error: null,
    });

    expect(await getAiCreditSummaryForAdmin(client)).toEqual({
      totalUsers: 10,
      usersWithUse: 4,
      usersExhausted: 1,
      creditsSpent: 90,
      spends24h: 12,
      refunds24h: 3,
      refundUsers24h: 2,
    });
  });

  it("fails clearly when the function returns no row", async () => {
    const { client } = rpcClient({ data: [], error: null });
    await expect(getAiCreditSummaryForAdmin(client)).rejects.toThrow(/metrics/);
  });
});

describe("listAiCreditFailureReasonsForAdmin", () => {
  it("maps the reasons and asks for the top five", async () => {
    const { client, calls } = rpcClient({
      data: [
        {
          reason: "Provider error 429: Quota exceeded",
          failures: 7,
          people: 3,
          last_seen: "2026-09-29T10:00:00Z",
        },
      ],
      error: null,
    });

    expect(await listAiCreditFailureReasonsForAdmin(client)).toEqual([
      {
        reason: "Provider error 429: Quota exceeded",
        failures: 7,
        people: 3,
        lastSeen: "2026-09-29T10:00:00Z",
      },
    ]);
    expect(calls).toEqual([{ name: "admin_ai_credit_failure_reasons", args: { p_limit: 5 } }]);
  });

  it("returns an empty list when nothing failed", async () => {
    const { client } = rpcClient({ data: null, error: null });
    expect(await listAiCreditFailureReasonsForAdmin(client)).toEqual([]);
  });
});
