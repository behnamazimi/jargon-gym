import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  insertError: null as null | { code: string },
  inserted: [] as unknown[],
  notified: 0,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      insert: async (row: unknown) => {
        state.inserted.push(row);
        return { error: state.insertError };
      },
    }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/auth/require-session", () => ({ getSessionUser: async () => ({ user: null }) }));
vi.mock("@/lib/auth/app-origin", () => ({ getAppOrigin: async () => "https://app.test" }));
vi.mock("@/lib/analytics/server", () => ({ trackServer: () => undefined }));
vi.mock("@/lib/email/resend", () => ({
  sendWaitlistRequestNotification: async () => {
    state.notified += 1;
  },
}));
vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => {
    void task();
  },
}));

const { requestAccess } = await import("./actions");

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

beforeEach(() => {
  state.insertError = null;
  state.inserted = [];
  state.notified = 0;
});

describe("requestAccess", () => {
  it("confirms with the address the invite will go to", async () => {
    const result = await requestAccess(null, form({ email: " Ann@Example.com " }));
    expect(result).toEqual({ success: true, email: "Ann@Example.com" });
    expect(state.inserted).toHaveLength(1);
  });

  it("shows the same screen for a repeat request without saving it again", async () => {
    state.insertError = { code: "23505" };
    const result = await requestAccess(null, form({ email: "ann@example.com" }));
    expect(result).toEqual({ success: true, email: "ann@example.com" });
  });

  it("shows the same screen when the hidden field is filled in, and saves nothing", async () => {
    const result = await requestAccess(null, form({ email: "bot@example.com", company: "Acme" }));
    expect(result).toEqual({ success: true, email: "bot@example.com" });
    expect(state.inserted).toEqual([]);
  });

  it("asks for a valid address", async () => {
    expect(await requestAccess(null, form({ email: "not-an-email" }))).toEqual({
      error: "Enter a valid email address.",
    });
  });
});
