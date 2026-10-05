import { beforeEach, describe, expect, it, vi } from "vitest";
import { toPlacement, type TermLayout } from "@/lib/terms/term-layout";

const DOMAIN = "11111111-1111-4111-8111-111111111111";

const state = vi.hoisted(() => ({
  stored: { default: {}, collections: {} } as TermLayout,
  saved: [] as TermLayout[],
  signedIn: true,
}));

vi.mock("@/lib/auth/require-session", () => ({
  requireAuthenticatedClient: async () =>
    state.signedIn ? { supabase: {}, user: { id: "u1" } } : { error: "Log in to continue." },
}));
vi.mock("@/lib/terms/term-layout-repository", () => ({
  loadTermLayout: async () => state.stored,
  saveTermLayout: async (_client: unknown, _userId: string, layout: TermLayout) => {
    state.saved.push(layout);
  },
}));

const { saveTermLayoutAction } = await import("./term-layout-actions");

beforeEach(() => {
  state.stored = { default: { note: "more" }, collections: {} };
  state.saved = [];
  state.signedIn = true;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("saveTermLayoutAction", () => {
  it("needs a signed-in user", async () => {
    state.signedIn = false;
    const result = await saveTermLayoutAction({
      scope: "default",
      placement: toPlacement({}),
    });
    expect(result.error).toBe("Log in to continue.");
    expect(state.saved).toEqual([]);
  });

  it("saves a collection's map and keeps the default", async () => {
    const result = await saveTermLayoutAction({
      scope: "collection",
      domainId: DOMAIN,
      placement: toPlacement({ example: "more" }),
    });
    expect(result.layout).toEqual({
      default: { note: "more" },
      collections: { [DOMAIN]: { example: "more" } },
    });
    expect(state.saved).toHaveLength(1);
  });

  it("saving for all collections leaves their own maps alone", async () => {
    state.stored = {
      default: {},
      collections: { [DOMAIN]: { example: "more" } },
    };
    const result = await saveTermLayoutAction({
      scope: "default",
      placement: toPlacement({ note: "more" }),
    });
    expect(result.layout?.collections).toEqual({
      [DOMAIN]: { example: "more" },
    });
    expect(result.layout?.default).toEqual({ note: "more" });
  });

  it("removes a collection's own map", async () => {
    state.stored = {
      default: {},
      collections: { [DOMAIN]: { example: "more" } },
    };
    const result = await saveTermLayoutAction({
      scope: "reset-collection",
      domainId: DOMAIN,
    });
    expect(result.layout?.collections).toEqual({});
  });

  it("rejects a bad collection id or placement without saving", async () => {
    const badDomain = await saveTermLayoutAction({
      scope: "collection",
      domainId: "nope",
      placement: toPlacement({}),
    });
    const badPlacement = await saveTermLayoutAction({
      scope: "default",
      placement: { note: "more" },
    });
    expect(badDomain.error).toBeDefined();
    expect(badPlacement.error).toBeDefined();
    expect(state.saved).toEqual([]);
  });
});
