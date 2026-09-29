import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { runWithCredits } from "./charge";

type Client = SupabaseClient<Database>;
type Reservation = { status: string; remaining: number; ledger_id: number | null };

function fakeAdmin(
  reservation: Reservation,
  refund: () => { error: Error | null } = () => ({ error: null }),
) {
  const calls: { name: string; args: unknown }[] = [];
  const admin = {
    rpc: (name: string, args: unknown) => {
      calls.push({ name, args });
      if (name === "reserve_ai_credits")
        return Promise.resolve({ data: [reservation], error: null });
      return Promise.resolve(refund());
    },
  } as unknown as Client;
  return { admin, calls };
}

const base = { userId: "u1", feature: "quiz" as const, cost: 8 };

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));

describe("runWithCredits", () => {
  it("keeps the charge when the work succeeds", async () => {
    const { admin, calls } = fakeAdmin({ status: "ok", remaining: 42, ledger_id: 7 });
    const outcome = await runWithCredits({ admin, ...base }, async () => "quiz");

    expect(outcome).toEqual({ charged: true, value: "quiz", remaining: 42 });
    expect(calls.map((call) => call.name)).toEqual(["reserve_ai_credits"]);
  });

  it("refunds and rethrows when the work throws", async () => {
    const { admin, calls } = fakeAdmin({ status: "ok", remaining: 42, ledger_id: 7 });
    const failure = new Error("model returned garbage");

    await expect(
      runWithCredits({ admin, ...base }, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(calls).toEqual([
      { name: "reserve_ai_credits", args: { p_user_id: "u1", p_feature: "quiz", p_cost: 8 } },
      {
        name: "refund_ai_credits",
        args: { p_ledger_id: 7, p_reason: "Error: model returned garbage" },
      },
    ]);
  });

  it("still surfaces the original error when the refund itself fails", async () => {
    const { admin } = fakeAdmin({ status: "ok", remaining: 42, ledger_id: 7 }, () => ({
      error: new Error("db down"),
    }));
    const failure = new Error("timeout");

    await expect(
      runWithCredits({ admin, ...base }, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
  });

  it("does not run the work when the balance is too low", async () => {
    const { admin, calls } = fakeAdmin({ status: "insufficient", remaining: 3, ledger_id: null });
    const run = vi.fn();
    const outcome = await runWithCredits({ admin, ...base }, run);

    expect(outcome).toEqual({ charged: false, reason: "insufficient", remaining: 3, cost: 8 });
    expect(run).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
  });

  it("does not run the work when credits are switched off", async () => {
    const { admin } = fakeAdmin({ status: "disabled", remaining: 50, ledger_id: null });
    const run = vi.fn();
    const outcome = await runWithCredits({ admin, ...base }, run);

    expect(outcome).toMatchObject({ charged: false, reason: "disabled" });
    expect(run).not.toHaveBeenCalled();
  });
});
