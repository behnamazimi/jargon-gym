import { beforeEach, describe, expect, it, vi } from "vitest";
import { RATE_LIMITED_ERROR } from "@/lib/auth/format-auth-error";

const state = vi.hoisted(() => ({
  error: null as null | { code?: string; message: string },
  calls: [] as unknown[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      resend: async (args: unknown) => {
        state.calls.push(args);
        return { error: state.error };
      },
    },
  }),
}));
vi.mock("@/lib/auth/app-origin", () => ({ getAppOrigin: async () => "https://app.test" }));
vi.mock("@/lib/analytics/server", () => ({ trackServer: () => undefined }));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));

const { resendConfirmation } = await import("./actions");

beforeEach(() => {
  state.error = null;
  state.calls = [];
});

describe("resendConfirmation", () => {
  it("asks Supabase to resend the signup email with the same redirect as sign-up", async () => {
    const result = await resendConfirmation(" me@example.com ", "/app/library");
    expect(result).toEqual({});
    expect(state.calls).toEqual([
      {
        type: "signup",
        email: "me@example.com",
        options: {
          emailRedirectTo: "https://app.test/auth/callback?flow=email&next=%2Fapp%2Flibrary",
        },
      },
    ]);
  });

  it("falls back to the default home for an unsafe next path", async () => {
    await resendConfirmation("me@example.com", "https://evil.test");
    expect(JSON.stringify(state.calls)).toContain("next=%2Fapp%2Freview");
  });

  it("reports a rate limit with the shared wording", async () => {
    state.error = { code: "over_email_send_rate_limit", message: "slow down" };
    expect(await resendConfirmation("me@example.com")).toEqual({ error: RATE_LIMITED_ERROR });
  });

  it("gives one plain message for any other failure", async () => {
    state.error = { code: "unexpected_failure", message: "boom" };
    expect(await resendConfirmation("me@example.com")).toEqual({
      error: "Couldn't resend the email. Try again.",
    });
  });

  it("does not call Supabase without an address", async () => {
    expect(await resendConfirmation("  ")).toEqual({
      error: "Couldn't resend the email. Try again.",
    });
    expect(state.calls).toEqual([]);
  });
});
