import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { withRunGuard } from "./run-guard";

type Client = SupabaseClient<Database>;

function fakeAdmin(begin: { data: string | null; error: Error | null }) {
  const calls: { name: string; args: unknown }[] = [];
  const admin = {
    rpc: (name: string, args: unknown) => {
      calls.push({ name, args });
      if (name === "begin_ai_run") return Promise.resolve(begin);
      return Promise.resolve({ data: null, error: null });
    },
  } as unknown as Client;
  return { admin, calls };
}

const base = { userId: "u1", feature: "quiz" as const };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("withRunGuard", () => {
  it("runs and releases the guard with its own token", async () => {
    const { admin, calls } = fakeAdmin({ data: "tok", error: null });
    const outcome = await withRunGuard({ admin, ...base }, async () => 42);
    expect(outcome).toEqual({ busy: false, value: 42 });
    expect(calls.map((call) => call.name)).toEqual(["begin_ai_run", "end_ai_run"]);
    expect(calls[1]?.args).toMatchObject({ p_token: "tok" });
  });

  it("is busy, and does not run, while another request holds the guard", async () => {
    const { admin, calls } = fakeAdmin({ data: null, error: null });
    const run = vi.fn();
    expect(await withRunGuard({ admin, ...base }, run)).toEqual({ busy: true });
    expect(run).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
  });

  it("releases the guard when the work throws", async () => {
    const { admin, calls } = fakeAdmin({ data: "tok", error: null });
    await expect(
      withRunGuard({ admin, ...base }, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(calls.map((call) => call.name)).toEqual(["begin_ai_run", "end_ai_run"]);
  });

  it("runs unguarded when the guard can't be reached", async () => {
    const { admin, calls } = fakeAdmin({ data: null, error: new Error("function not found") });
    expect(await withRunGuard({ admin, ...base }, async () => "ok")).toEqual({
      busy: false,
      value: "ok",
    });
    expect(calls.map((call) => call.name)).toEqual(["begin_ai_run"]);
  });
});
