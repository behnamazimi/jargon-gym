import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  calls: [] as { name: string; args: unknown }[],
  error: null as { code?: string; message: string } | null,
  revalidated: [] as string[],
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => state.revalidated.push(path),
}));
vi.mock("@/lib/auth/require-session", () => ({
  requireAdminClient: async () => ({
    user: { id: "admin-1" },
    supabase: {
      rpc: async (name: string, args: unknown) => {
        state.calls.push({ name, args });
        return { data: null, error: state.error };
      },
    },
  }),
}));

import { createSharedCode, setSharedCodeActive } from "./codes-actions";

const valid = { code: "launch50", label: "Newsletter", maxUses: 50, endDate: "2026-11-01" };

beforeEach(() => {
  state.calls = [];
  state.error = null;
  state.revalidated = [];
});

describe("createSharedCode", () => {
  it("sends the end of the chosen day and refreshes the page", async () => {
    expect(await createSharedCode(valid)).toEqual({ ok: true, data: undefined });
    expect(state.calls).toEqual([
      {
        name: "admin_create_shared_referral_code",
        args: {
          p_code: "launch50",
          p_label: "Newsletter",
          p_max_uses: 50,
          p_expires_at: "2026-11-01T23:59:59.999Z",
        },
      },
    ]);
    expect(state.revalidated).toEqual(["/admin/people"]);
  });

  it("rejects incomplete input without calling the database", async () => {
    const result = await createSharedCode({ ...valid, label: "  " });
    expect(result).toEqual({ ok: false, error: "Fill in the code, label, seats and end date." });
    expect(state.calls).toEqual([]);
  });

  it("shows the database's readable errors", async () => {
    state.error = { code: "AD001", message: "That code already exists." };
    expect(await createSharedCode(valid)).toEqual({
      ok: false,
      error: "That code already exists.",
    });
  });

  it("hides any other database error", async () => {
    state.error = { message: "connection reset" };
    const result = await createSharedCode(valid);
    expect(result).toEqual({ ok: false, error: "Something went wrong. Try again." });
  });
});

describe("setSharedCodeActive", () => {
  it("pauses a code", async () => {
    const id = "3f6c1a2e-8a31-4a62-9d38-6c0a6b9a1f10";
    expect((await setSharedCodeActive(id, false)).ok).toBe(true);
    expect(state.calls).toEqual([
      { name: "admin_set_referral_code_active", args: { p_id: id, p_active: false } },
    ]);
  });

  it("refuses an id that isn't a uuid", async () => {
    expect(await setSharedCodeActive("nope", true)).toEqual({
      ok: false,
      error: "That code isn't valid.",
    });
    expect(state.calls).toEqual([]);
  });
});
