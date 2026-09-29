import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ user: null as { id: string } | null, admin: false }));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/lib/auth/require-session", () => ({
  getSessionUser: async () => ({ supabase: { tag: "client" }, user: state.user }),
  getUserIsAdmin: async () => state.admin,
}));

const { requireAdminPage } = await import("./page-guard");

beforeEach(() => {
  state.user = null;
  state.admin = false;
});

describe("requireAdminPage", () => {
  it("404s a signed-out visitor", async () => {
    await expect(requireAdminPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404s a signed-in member", async () => {
    state.user = { id: "u1" };
    await expect(requireAdminPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("gives an admin the client", async () => {
    state.user = { id: "u1" };
    state.admin = true;
    expect(await requireAdminPage()).toMatchObject({ supabase: { tag: "client" } });
  });
});
