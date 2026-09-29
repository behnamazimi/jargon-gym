import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { runMetered } from "./run-metered";

type Client = SupabaseClient<Database>;

function fakeAdmin(options: { token: string | null; reservationStatus?: string }) {
  const calls: string[] = [];
  const admin = {
    rpc: (name: string) => {
      calls.push(name);
      if (name === "begin_ai_run") return Promise.resolve({ data: options.token, error: null });
      if (name === "reserve_ai_credits") {
        const ok = (options.reservationStatus ?? "ok") === "ok";
        return Promise.resolve({
          data: [
            { status: options.reservationStatus ?? "ok", remaining: 5, ledger_id: ok ? 9 : null },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
  } as unknown as Client;
  return { admin, calls };
}

const base = { userId: "u1", feature: "quiz" as const, cost: 3 };

describe("runMetered", () => {
  it("takes the guard, charges, runs and releases the guard", async () => {
    const { admin, calls } = fakeAdmin({ token: "t1" });
    const outcome = await runMetered({ admin, ...base }, async () => "done");
    expect(outcome).toEqual({ charged: true, value: "done", remaining: 5 });
    expect(calls).toEqual(["begin_ai_run", "reserve_ai_credits", "end_ai_run"]);
  });

  it("refuses a second run without charging", async () => {
    const { admin, calls } = fakeAdmin({ token: null });
    const outcome = await runMetered({ admin, ...base }, async () => "never");
    expect(outcome).toEqual({ charged: false, reason: "busy" });
    expect(calls).toEqual(["begin_ai_run"]);
  });

  it("refunds and still releases the guard when the work throws", async () => {
    const { admin, calls } = fakeAdmin({ token: "t1" });
    await expect(
      runMetered({ admin, ...base }, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(calls).toEqual([
      "begin_ai_run",
      "reserve_ai_credits",
      "refund_ai_credits",
      "end_ai_run",
    ]);
  });

  it("releases the guard when credits are refused", async () => {
    const { admin, calls } = fakeAdmin({ token: "t1", reservationStatus: "insufficient" });
    const outcome = await runMetered({ admin, ...base }, async () => "never");
    expect(outcome).toMatchObject({ charged: false, reason: "insufficient" });
    expect(calls).toEqual(["begin_ai_run", "reserve_ai_credits", "end_ai_run"]);
  });
});
