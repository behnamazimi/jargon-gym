import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  admin: true,
  account: { id: "u1", email: "a@example.test" } as { id: string; email: string } | null,
  ilikeArgs: [] as string[],
  updated: [] as unknown[],
  updatedWhere: [] as unknown[],
  updatedFeatures: [] as unknown[],
  capRows: {} as Record<string, unknown[]>,
  updateRows: [{ feature: "narration_term" }, { feature: "narration_story" }] as unknown[],
  upserts: [] as unknown[],
  upsertOptions: [] as unknown[],
  deleted: [] as unknown[],
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.spyOn(console, "error").mockImplementation(() => undefined);
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/narration/sync", () => ({}));
vi.mock("@/lib/auth/require-session", async () => {
  const { AdminError } = await import("@/lib/admin/admin-error");
  return {
    requireAdminClient: async () => {
      if (!state.admin) throw new AdminError("Admins only.");
      return {
        user: { id: "admin-1" },
        supabase: {
          from: (table: string) => {
            if (table === "users") {
              return {
                select: () => ({
                  ilike: (_column: string, pattern: string) => {
                    state.ilikeArgs.push(pattern);
                    return {
                      maybeSingle: () => Promise.resolve({ data: state.account, error: null }),
                    };
                  },
                }),
              };
            }
            if (table === "ai_feature_settings") {
              return {
                update: (values: unknown) => {
                  state.updated.push(values);
                  return {
                    eq: (_column: string, feature: string) => {
                      state.updatedWhere.push(feature);
                      return {
                        select: () =>
                          Promise.resolve({ data: state.capRows[feature] ?? [], error: null }),
                      };
                    },
                    in: (_column: string, features: unknown) => {
                      state.updatedFeatures.push(features);
                      return {
                        select: () => Promise.resolve({ data: state.updateRows, error: null }),
                      };
                    },
                  };
                },
              };
            }
            if (table === "ai_feature_allowlist") {
              return {
                upsert: (rows: unknown, options: unknown) => {
                  state.upserts.push(rows);
                  state.upsertOptions.push(options);
                  return Promise.resolve({ error: null });
                },
                delete: () => ({
                  in: (_column: string, features: unknown) => ({
                    eq: (_c: string, userId: string) => {
                      state.deleted.push({ features, userId });
                      return Promise.resolve({ error: null });
                    },
                  }),
                }),
              };
            }
            throw new Error(`Unexpected table: ${table}`);
          },
        },
      };
    },
  };
});

const {
  addToNarrationAllowlist,
  removeFromNarrationAllowlist,
  setNarrationCaps,
  setNarrationEnabled,
} = await import("./actions");

const BOTH = ["narration_term", "narration_story"];

beforeEach(() => {
  state.admin = true;
  state.account = { id: "u1", email: "a@example.test" };
  state.ilikeArgs = [];
  state.updated = [];
  state.updatedWhere = [];
  state.capRows = {
    narration_term: [{ feature: "narration_term" }],
    narration_story: [{ feature: "narration_story" }],
  };
  state.updatedFeatures = [];
  state.updateRows = [{ feature: "narration_term" }, { feature: "narration_story" }];
  state.upserts = [];
  state.upsertOptions = [];
  state.deleted = [];
});

describe("narration admin actions", () => {
  it("switches both narration features together, and nothing else", async () => {
    expect(await setNarrationEnabled(true)).toEqual({ ok: true, data: undefined });
    expect(state.updated).toEqual([{ enabled: true }]);
    expect(state.updatedFeatures).toEqual([BOTH]);
  });

  it("fails when a feature row didn't change, as a non-admin's update would", async () => {
    state.updateRows = [];
    expect(await setNarrationEnabled(true)).toEqual({
      ok: false,
      error: "Couldn't change the switch.",
    });
  });

  it("allowlists a person for both features", async () => {
    expect(await addToNarrationAllowlist("a@example.test")).toEqual({
      ok: true,
      data: { userId: "u1", email: "a@example.test" },
    });
    expect(state.upserts).toEqual([
      [
        { feature: "narration_term", user_id: "u1" },
        { feature: "narration_story", user_id: "u1" },
      ],
    ]);
    // Adding someone already on the list must be a no-op, not an update.
    expect(state.upsertOptions).toEqual([
      { onConflict: "feature,user_id", ignoreDuplicates: true },
    ]);
  });

  it("looks the email up exactly, so _ and % are not wildcards", async () => {
    await addToNarrationAllowlist(" a_b@example.test ");
    expect(state.ilikeArgs).toEqual(["a\\_b@example.test"]);
  });

  it("says so when there is no such account", async () => {
    state.account = null;
    expect(await addToNarrationAllowlist("nobody@example.test")).toEqual({
      ok: false,
      error: "No account found for that email.",
    });
    expect(state.upserts).toEqual([]);
  });

  it("removes a person from both features", async () => {
    await removeFromNarrationAllowlist("u1");
    expect(state.deleted).toEqual([{ features: BOTH, userId: "u1" }]);
  });

  it("keeps non-admins out", async () => {
    state.admin = false;
    expect(await setNarrationEnabled(true)).toEqual({ ok: false, error: "Admins only." });
    expect(state.updated).toEqual([]);
  });
});

describe("setNarrationCaps", () => {
  it("saves both caps, a blank term cap meaning no limit", async () => {
    expect(await setNarrationCaps({ term: null, story: 15 })).toMatchObject({ ok: true });
    expect(state.updated).toEqual([{ daily_cap: null }, { daily_cap: 15 }]);
    expect(state.updatedWhere).toEqual(["narration_term", "narration_story"]);
  });

  it("keeps a cap on stories and refuses nonsense numbers", async () => {
    for (const input of [
      { term: null, story: 0 },
      { term: 5, story: 1.5 },
      { term: -1, story: 5 },
      { term: 5, story: 5000 },
    ]) {
      expect(await setNarrationCaps(input)).toMatchObject({ ok: false, error: expect.any(String) });
    }
    expect(state.updated).toEqual([]);
  });

  it("says so when a row didn't change, as a non-admin's update wouldn't", async () => {
    state.capRows = {};
    expect(await setNarrationCaps({ term: 5, story: 5 })).toEqual({
      ok: false,
      error: "Couldn't save the caps.",
    });
  });

  it("keeps non-admins out", async () => {
    state.admin = false;
    expect(await setNarrationCaps({ term: 5, story: 5 })).toMatchObject({ ok: false });
  });
});
