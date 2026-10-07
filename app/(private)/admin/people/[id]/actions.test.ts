import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rpcCalls: [] as { name: string; args: unknown }[],
  rpcError: null as { code?: string; message: string } | null,
  revalidated: [] as string[],
  screenshotsRemovedFor: [] as string[],
  screenshotsFail: false,
}));

vi.mock("@/lib/issues/storage", () => ({
  deleteUserScreenshots: async (userId: string) => {
    if (state.screenshotsFail) throw new Error("S3 down");
    state.screenshotsRemovedFor.push(userId);
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: (path: string) => state.revalidated.push(path) }));
vi.mock("@/lib/auth/require-session", () => ({
  requireAdminClient: async () => ({
    user: { id: "admin-1" },
    supabase: {
      rpc: async (name: string, args: unknown) => {
        state.rpcCalls.push({ name, args });
        return { data: null, error: state.rpcError };
      },
    },
  }),
}));

const { deleteUser, setUserSuspended } = await import("./actions");

const ID = "3f2b8c1e-0a4d-4c55-9d1e-7a6b5c4d3e2f";
const GENERIC = "Something went wrong. Try again.";

beforeEach(() => {
  state.rpcCalls = [];
  state.rpcError = null;
  state.revalidated = [];
  state.screenshotsRemovedFor = [];
  state.screenshotsFail = false;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("setUserSuspended", () => {
  it("suspends through the database function and refreshes the person's pages", async () => {
    const result = await setUserSuspended({ userId: ID, suspended: true, reason: "  spam  " });
    expect(result).toEqual({ ok: true, data: undefined });
    expect(state.rpcCalls).toEqual([
      {
        name: "admin_set_user_suspended",
        args: { p_user_id: ID, p_suspended: true, p_reason: "spam" },
      },
    ]);
    expect(state.revalidated).toEqual(["/admin", "/admin/people", `/admin/people/${ID}`]);
  });

  it("reactivates when suspended is false", async () => {
    await setUserSuspended({ userId: ID, suspended: false, reason: "sorted" });
    expect(state.rpcCalls[0]?.args).toMatchObject({ p_suspended: false });
  });

  it("refuses a bad id or a missing or long reason without calling the database", async () => {
    for (const input of [
      { userId: "nope", suspended: true, reason: "x" },
      { userId: ID, suspended: true, reason: "   " },
      { userId: ID, suspended: true, reason: "x".repeat(201) },
    ]) {
      const result = await setUserSuspended(input);
      expect(result.ok).toBe(false);
    }
    expect(state.rpcCalls).toEqual([]);
  });

  it("shows a readable database refusal and hides any other database error", async () => {
    state.rpcError = { code: "AD001", message: "Admin accounts can't be changed here." };
    expect(await setUserSuspended({ userId: ID, suspended: true, reason: "x" })).toEqual({
      ok: false,
      error: "Admin accounts can't be changed here.",
    });
    expect(state.revalidated).toEqual([]);

    state.rpcError = { code: "42883", message: "function admin_set_user_suspended does not exist" };
    expect(await setUserSuspended({ userId: ID, suspended: true, reason: "x" })).toEqual({
      ok: false,
      error: GENERIC,
    });
  });
});

describe("deleteUser", () => {
  it("sends the typed email and the reason; the database does the comparing", async () => {
    await deleteUser({ userId: ID, reason: "requested", confirmEmail: " A@Example.test " });
    expect(state.rpcCalls).toEqual([
      {
        name: "admin_delete_user",
        args: { p_user_id: ID, p_confirm_email: "A@Example.test", p_reason: "requested" },
      },
    ]);
  });

  it("removes their issue screenshots once the account is gone", async () => {
    await deleteUser({ userId: ID, reason: "requested", confirmEmail: "a@example.test" });
    expect(state.screenshotsRemovedFor).toEqual([ID]);
  });

  it("still succeeds when the screenshots can't be removed", async () => {
    state.screenshotsFail = true;
    const result = await deleteUser({ userId: ID, reason: "x", confirmEmail: "a@example.test" });
    expect(result.ok).toBe(true);
  });

  it("doesn't refresh the page of the person who no longer exists", async () => {
    await deleteUser({ userId: ID, reason: "requested", confirmEmail: "a@example.test" });
    expect(state.revalidated).toEqual(["/admin", "/admin/people"]);
  });

  it("needs the email and a reason", async () => {
    expect((await deleteUser({ userId: ID, reason: "x", confirmEmail: " " })).ok).toBe(false);
    expect((await deleteUser({ userId: ID, reason: "", confirmEmail: "a@example.test" })).ok).toBe(
      false,
    );
    expect(state.rpcCalls).toEqual([]);
  });

  it("shows the reason a delete was refused", async () => {
    state.rpcError = {
      code: "AD001",
      message:
        "Can't delete: 2 other people use their collections. Make the collections private first.",
    };
    const result = await deleteUser({ userId: ID, reason: "x", confirmEmail: "a@example.test" });
    expect(result).toEqual({ ok: false, error: state.rpcError.message });
    expect(state.screenshotsRemovedFor).toEqual([]);
  });
});
