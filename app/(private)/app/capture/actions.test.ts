import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rows: [] as { term: string; definition: string | null }[],
  error: null as Error | null,
  signedIn: true,
  ilike: [] as string[],
  eq: [] as [string, string][],
}));

vi.mock("@/lib/auth/require-session", () => ({
  requireAuthenticatedClient: async () => {
    if (!state.signedIn) return { error: "Sign in" };
    const node: Record<string, unknown> = {};
    node.select = () => node;
    node.eq = (column: string, value: string) => {
      state.eq.push([column, value]);
      return node;
    };
    node.ilike = (_column: string, pattern: string) => {
      state.ilike.push(pattern);
      return node;
    };
    node.limit = () => Promise.resolve({ data: state.rows, error: state.error });
    return { user: { id: "u1" }, supabase: { from: () => node } };
  },
}));

import { findCaptureDuplicate } from "./actions";

const collectionId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  Object.assign(state, { rows: [], error: null, signedIn: true, ilike: [], eq: [] });
});

describe("findCaptureDuplicate", () => {
  it("rejects bad input", async () => {
    expect(await findCaptureDuplicate({ collectionId: "nope", term: "SLA" })).toEqual({
      ok: false,
    });
    expect(await findCaptureDuplicate({ collectionId, term: "   " })).toEqual({ ok: false });
  });

  it("fails quietly when signed out", async () => {
    state.signedIn = false;
    expect(await findCaptureDuplicate({ collectionId, term: "SLA" })).toEqual({ ok: false });
  });

  it("returns no match for an empty result", async () => {
    expect(await findCaptureDuplicate({ collectionId, term: "SLA" })).toEqual({
      ok: true,
      match: null,
    });
  });

  it("reports a finished and an unfinished match", async () => {
    state.rows = [{ term: "SLA", definition: "x" }];
    expect(await findCaptureDuplicate({ collectionId, term: " sla " })).toEqual({
      ok: true,
      match: { term: "SLA", finished: true },
    });
    state.rows = [{ term: "SLA", definition: null }];
    expect(await findCaptureDuplicate({ collectionId, term: "sla" })).toEqual({
      ok: true,
      match: { term: "SLA", finished: false },
    });
  });

  it("escapes wildcards and scopes to the owner", async () => {
    await findCaptureDuplicate({ collectionId, term: "100%_done" });
    expect(state.ilike).toEqual(["100\\%\\_done"]);
    expect(state.eq).toContainEqual(["collections.owner_id", "u1"]);
  });

  it("returns not ok on a database error", async () => {
    state.error = new Error("boom");
    expect(await findCaptureDuplicate({ collectionId, term: "SLA" })).toEqual({ ok: false });
  });
});
