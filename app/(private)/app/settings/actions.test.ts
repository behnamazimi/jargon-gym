import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  signedIn: true,
  identities: [{ provider: "email" }] as { provider: string }[],
  verifyError: null as null | { code?: string; message: string },
  updateError: null as null | { code?: string; message: string },
  calls: [] as string[],
}));

const supabase = {
  auth: {
    getUser: async () => ({
      data: { user: { email: "me@example.com", identities: state.identities } },
    }),
    signInWithPassword: async () => {
      state.calls.push("verify");
      return { error: state.verifyError };
    },
    updateUser: async () => {
      state.calls.push("update");
      return { error: state.updateError };
    },
    signOut: async (options: { scope: string }) => {
      state.calls.push(`signOut:${options.scope}`);
      return { error: null };
    },
  },
};

vi.mock("@/lib/auth/require-session", () => ({
  requireAuthenticatedClient: async () =>
    state.signedIn ? { supabase, user: { id: "u1" } } : { error: "Log in to continue." },
}));
vi.mock("@/app/(private)/auth/actions", () => ({ logout: async () => undefined }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/llm/access", () => ({ getAiAccessView: async () => ({}) }));
vi.mock("@/lib/telegram/links", () => ({}));
vi.mock("@/lib/widget/tokens", () => ({}));
vi.mock("@/lib/issues/storage", () => ({ deleteUserScreenshots: async () => undefined }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { changePasswordAction } = await import("./actions");

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const VALID = {
  currentPassword: "old-pass-1",
  password: "new-pass-2",
  confirmPassword: "new-pass-2",
};

beforeEach(() => {
  state.signedIn = true;
  state.identities = [{ provider: "email" }];
  state.verifyError = null;
  state.updateError = null;
  state.calls = [];
});

describe("changePasswordAction", () => {
  it("needs a signed-in user", async () => {
    state.signedIn = false;
    expect(await changePasswordAction(null, form(VALID))).toEqual({
      error: "Log in to continue.",
    });
    expect(state.calls).toEqual([]);
  });

  it("rejects a weak password and a mismatch before touching Supabase", async () => {
    expect(
      await changePasswordAction(
        null,
        form({ ...VALID, password: "short", confirmPassword: "short" }),
      ),
    ).toMatchObject({
      error: expect.stringContaining("at least 8"),
    });
    expect(
      await changePasswordAction(null, form({ ...VALID, confirmPassword: "different-3" })),
    ).toEqual({ error: "Passwords don't match." });
    expect(state.calls).toEqual([]);
  });

  it("checks the current password first and stops when it is wrong", async () => {
    state.verifyError = { code: "invalid_credentials", message: "Invalid login credentials" };
    expect(await changePasswordAction(null, form(VALID))).toEqual({
      error: "That isn't your current password.",
    });
    expect(state.calls).toEqual(["verify"]);
  });

  it("asks for the current password when the account has one", async () => {
    const result = await changePasswordAction(null, form({ ...VALID, currentPassword: "" }));
    expect(result).toEqual({ error: "Enter your current password." });
    expect(state.calls).toEqual([]);
  });

  it("changes the password and signs out the other devices only", async () => {
    const result = await changePasswordAction(null, form(VALID));
    expect(result).toMatchObject({ success: true });
    expect(state.calls).toEqual(["verify", "update", "signOut:others"]);
  });

  it("lets a Google-only account set a password without a current one", async () => {
    state.identities = [{ provider: "google" }];
    const result = await changePasswordAction(null, form({ ...VALID, currentPassword: "" }));
    expect(result).toMatchObject({ success: true });
    expect(state.calls).toEqual(["update", "signOut:others"]);
  });

  it("refuses to reuse the current password", async () => {
    const result = await changePasswordAction(
      null,
      form({
        currentPassword: "same-pass-1",
        password: "same-pass-1",
        confirmPassword: "same-pass-1",
      }),
    );
    expect(result).toMatchObject({ error: expect.stringContaining("different") });
    expect(state.calls).toEqual([]);
  });
});
