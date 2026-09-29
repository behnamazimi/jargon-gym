import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  admin: true,
  account: { id: "u1", email: "a@example.test" } as { id: string; email: string } | null,
  ilikeArgs: [] as string[],
  rpcCalls: [] as { name: string; args: unknown }[],
  rpcError: null as { message: string } | null,
  collections: [] as Record<string, unknown>[],
  upserts: [] as unknown[],
  upsertOptions: [] as unknown[],
  deleted: [] as unknown[],
  enqueued: [] as string[],
  coverageFor: [] as { id: string; name: string }[],
  audits: [] as { action: string; targetId?: string; details?: unknown }[],
  member: 0,
  lastJob: null as Record<string, unknown> | null,
  cancelResult: null as Record<string, unknown> | null,
  auditError: null as { message: string } | null,
  canResume: false,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.spyOn(console, "error").mockImplementation(() => undefined);
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/narration/sync", () => ({
  cancelNarrationSync: async () => state.cancelResult ?? state.lastJob,
  canResumeNarrationSync: () => state.canResume,
  enqueueNarrationSync: async (_client: unknown, domainId: string) => {
    state.enqueued.push(domainId);
    return { id: "job-1" };
  },
  getLastNarrationSyncJob: async () => state.lastJob,
  kickNarrationSyncWorker: () => undefined,
  listCollectionNarrationCoverage: async (
    _client: unknown,
    collections: typeof state.coverageFor,
  ) => {
    state.coverageFor = collections;
    return [];
  },
}));
vi.mock("@/lib/auth/require-session", async () => {
  const { AdminError } = await import("@/lib/admin/admin-error");
  return {
    requireAdminClient: async () => {
      if (!state.admin) throw new AdminError("Admins only.");
      return {
        user: { id: "admin-1" },
        supabase: {
          rpc: (
            name: string,
            args: { p_action?: string; p_target_id?: string; p_details?: unknown },
          ) => {
            if (name === "admin_write_audit") {
              state.audits.push({
                action: args.p_action ?? "",
                targetId: args.p_target_id,
                details: args.p_details,
              });
              return Promise.resolve({ error: state.auditError });
            }
            state.rpcCalls.push({ name, args });
            if (name === "admin_list_collections") {
              return Promise.resolve({ data: state.collections, error: null });
            }
            return Promise.resolve({ error: state.rpcError });
          },
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
            if (table === "ai_feature_allowlist") {
              return {
                select: () => ({
                  eq: () => ({
                    in: () =>
                      Promise.resolve({
                        data: Array.from({ length: state.member }, () => ({ feature: "x" })),
                        error: null,
                      }),
                  }),
                }),
                upsert: (rows: unknown, options: unknown) => {
                  state.upserts.push(rows);
                  state.upsertOptions.push(options);
                  return Promise.resolve({ error: null });
                },
                delete: () => ({
                  in: (_column: string, features: unknown) => ({
                    eq: (_c: string, userId: string) => {
                      state.deleted.push({ features, userId });
                      return {
                        select: () =>
                          Promise.resolve({
                            data: Array.from({ length: state.member }, () => ({ feature: "x" })),
                            error: null,
                          }),
                      };
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
  cancelNarrationSyncJob,
  getNarrationSyncCoverage,
  removeFromNarrationAllowlist,
  resumeNarrationSync,
  setNarrationCaps,
  setNarrationEnabled,
  startNarrationSync,
} = await import("./actions");

const BOTH = ["narration_term", "narration_story"];

const collection = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `Collection ${id}`,
  owner_id: "admin-1",
  owner_email: null,
  visibility: "private",
  is_builtin: false,
  is_public: false,
  slug: null,
  term_count: 1,
  ...overrides,
});

beforeEach(() => {
  state.admin = true;
  state.account = { id: "u1", email: "a@example.test" };
  state.ilikeArgs = [];
  state.rpcCalls = [];
  state.rpcError = null;
  state.collections = [];
  state.upserts = [];
  state.upsertOptions = [];
  state.deleted = [];
  state.enqueued = [];
  state.coverageFor = [];
  state.audits = [];
  state.member = 0;
  state.lastJob = null;
  state.cancelResult = null;
  state.auditError = null;
  state.canResume = false;
});

describe("narration admin actions", () => {
  it("switches both narration features together in one call", async () => {
    expect(await setNarrationEnabled(true)).toEqual({ ok: true, data: undefined });
    expect(state.rpcCalls).toEqual([
      { name: "admin_set_narration_enabled", args: { p_enabled: true } },
    ]);
  });

  it("shows a generic message when the database refuses", async () => {
    state.rpcError = { message: "Expected both narration features to exist" };
    expect(await setNarrationEnabled(true)).toEqual({
      ok: false,
      error: "Something went wrong. Try again.",
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
    state.member = 2;
    await removeFromNarrationAllowlist("u1");
    expect(state.deleted).toEqual([{ features: BOTH, userId: "u1" }]);
  });

  it("still succeeds when the audit row can't be written", async () => {
    state.auditError = { message: "audit down" };
    expect(await addToNarrationAllowlist("a@example.test")).toMatchObject({ ok: true });
    expect(await startNarrationSync("mine").catch(() => null)).toBeDefined();
  });

  it("records access changes only when something changed", async () => {
    await addToNarrationAllowlist("a@example.test");
    expect(state.audits).toEqual([
      { action: "app.narration_access", targetId: "u1", details: { on: true } },
    ]);

    state.audits = [];
    state.member = 2;
    await addToNarrationAllowlist("a@example.test");
    expect(state.audits).toEqual([]);

    await removeFromNarrationAllowlist("u1");
    expect(state.audits).toEqual([
      { action: "app.narration_access", targetId: "u1", details: { on: false } },
    ]);

    state.audits = [];
    state.member = 0;
    await removeFromNarrationAllowlist("u1");
    expect(state.audits).toEqual([]);
  });

  it("keeps non-admins out", async () => {
    state.admin = false;
    expect(await setNarrationEnabled(true)).toEqual({ ok: false, error: "Admins only." });
    expect(state.rpcCalls).toEqual([]);
  });
});

describe("setNarrationCaps", () => {
  it("saves both caps in one call, a blank term cap meaning no limit", async () => {
    expect(await setNarrationCaps({ term: null, story: 15 })).toMatchObject({ ok: true });
    expect(state.rpcCalls).toEqual([
      { name: "admin_set_narration_caps", args: { p_term_cap: null, p_story_cap: 15 } },
    ]);
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
    expect(state.rpcCalls).toEqual([]);
  });

  it("keeps non-admins out", async () => {
    state.admin = false;
    expect(await setNarrationCaps({ term: 5, story: 5 })).toMatchObject({ ok: false });
  });
});

describe("narration sync collections", () => {
  beforeEach(() => {
    state.collections = [
      collection("mine"),
      collection("shared", { owner_id: "someone", visibility: "shared" }),
      collection("theirs", { owner_id: "someone", visibility: "private" }),
      collection("theirs-public", {
        owner_id: "someone",
        visibility: "private",
        is_builtin: true,
        is_public: true,
      }),
    ];
  });

  it("starts a sync for a collection an admin may act on", async () => {
    expect(await startNarrationSync("shared")).toMatchObject({ ok: true });
    expect(state.enqueued).toEqual(["shared"]);
  });

  it("allows a public collection even when it is someone else's private one", async () => {
    expect(await startNarrationSync("theirs-public")).toMatchObject({ ok: true });
  });

  it("records a started sync with its job", async () => {
    await startNarrationSync("mine");
    expect(state.audits).toEqual([
      { action: "app.narration_sync_start", targetId: "mine", details: { job: "job-1" } },
    ]);
  });

  it("records a cancel only when a sync was running, and a resume only when it could resume", async () => {
    state.lastJob = { id: "j1", domainId: "mine", status: "completed" };
    await cancelNarrationSyncJob();
    expect(state.audits).toEqual([]);

    // It finished, or another tab cancelled it, between looking and cancelling.
    state.lastJob = { id: "j1", domainId: "mine", status: "running" };
    state.cancelResult = { id: "j1", domainId: "mine", status: "completed" };
    await cancelNarrationSyncJob();
    expect(state.audits).toEqual([]);

    state.cancelResult = { id: "j1", domainId: "mine", status: "cancelled" };
    await cancelNarrationSyncJob();
    expect(state.audits).toEqual([
      { action: "app.narration_sync_cancel", targetId: "mine", details: { job: "j1" } },
    ]);

    state.audits = [];
    expect(await resumeNarrationSync()).toEqual({ ok: false, error: "Nothing to resume." });
    expect(state.audits).toEqual([]);
    state.canResume = true;
    await resumeNarrationSync();
    expect(state.audits).toEqual([
      { action: "app.narration_sync_resume", targetId: "mine", details: { job: "j1" } },
    ]);
  });

  it("refuses another person's private collection, whatever the browser sends", async () => {
    expect(await startNarrationSync("theirs")).toEqual({
      ok: false,
      error: "Collection not found.",
    });
    expect(await startNarrationSync("nope")).toEqual({ ok: false, error: "Collection not found." });
    expect(state.enqueued).toEqual([]);
  });

  it("only counts coverage for allowed collections, with names from the database", async () => {
    await getNarrationSyncCoverage([
      { id: "mine", name: "spoofed" },
      { id: "theirs", name: "Theirs" },
      { id: "unknown", name: "X" },
    ]);
    expect(state.coverageFor).toEqual([{ id: "mine", name: "Collection mine" }]);
  });
});
