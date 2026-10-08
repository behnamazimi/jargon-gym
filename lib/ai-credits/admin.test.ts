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

const NOW = "2026-10-18T00:00:00Z";

type PolicyRow = { source: string; amount: number; effective_to: string | null; id: number };
type PriceRow = {
  feature: string;
  base_credits: number;
  credits_per_unit: number;
  effective_from: string;
};

const policies: PolicyRow[] = [
  { id: 3, source: "self_topup", amount: 30, effective_to: null },
  { id: 2, source: "monthly", amount: 20, effective_to: null },
  { id: 1, source: "starter", amount: 50, effective_to: null },
];

function settingsClient(prices: PriceRow[], policyRows: PolicyRow[] = policies) {
  const chain = (data: unknown) => ({
    is: () => ({ lte: () => ({ order: () => Promise.resolve({ data, error: null }) }) }),
    lte: () => ({ order: () => Promise.resolve({ data, error: null }) }),
  });
  return {
    from: (table: string) => ({
      select: () =>
        table === "ai_credit_settings"
          ? {
              eq: () => ({
                single: () => Promise.resolve({ data: { enabled: true }, error: null }),
              }),
            }
          : chain(table === "credit_grant_policies" ? policyRows : prices),
    }),
  } as unknown as Client;
}

const prices: PriceRow[] = [
  { feature: "quiz", base_credits: 0, credits_per_unit: 1, effective_from: NOW },
  { feature: "story", base_credits: 2, credits_per_unit: 0.5, effective_from: NOW },
  { feature: "narration_story", base_credits: 0, credits_per_unit: 7.5, effective_from: NOW },
];

describe("getAiCreditSettingsForAdmin", () => {
  it("maps the policies in effect for new accounts and the price rows", async () => {
    expect(await getAiCreditSettingsForAdmin(settingsClient(prices))).toEqual({
      enabled: true,
      defaultAllowance: 50,
      monthlyRefill: 20,
      selfTopupAmount: 30,
      quizCreditsPerQuestion: 1,
      storyBaseCredits: 2,
      storyCreditsPerTerm: 0.5,
      narrationCreditsPerThousand: 7.5,
    });
  });

  it("shows a closed policy as zero", async () => {
    const closed = policies.map((row) =>
      row.source === "monthly" ? { ...row, effective_to: "2020-01-01T00:00:00Z" } : row,
    );
    expect((await getAiCreditSettingsForAdmin(settingsClient(prices, closed))).monthlyRefill).toBe(
      0,
    );
  });

  it("uses the newest price row", async () => {
    const newer = [{ ...prices[1]!, base_credits: 4, effective_from: "2026-10-19T00:00:00Z" }];
    const view = await getAiCreditSettingsForAdmin(settingsClient([...newer, ...prices]));
    expect(view.storyBaseCredits).toBe(4);
  });

  it("fails when a price is missing instead of guessing one", async () => {
    await expect(getAiCreditSettingsForAdmin(settingsClient([prices[0]!]))).rejects.toThrow(
      "prices are not set",
    );
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
