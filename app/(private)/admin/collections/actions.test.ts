import { beforeEach, describe, expect, it, vi } from "vitest";

type RpcResult = { data?: unknown; error?: { code?: string; message?: string } | null };

const state = vi.hoisted(() => ({
  list: [] as Record<string, unknown>[],
  terms: [] as { id: string; term: string; slug: string | null }[],
  publishResults: [] as RpcResult[],
  rpcCalls: [] as { name: string; args: unknown }[],
  updates: [] as { table: string; values: unknown }[],
  updateErrors: [] as ({ code?: string } | null)[],
  revalidated: [] as string[],
  termRangeCalls: [] as number[],
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) =>
    state.revalidated.push(type ? `${path}:${type}` : path),
}));
vi.spyOn(console, "error").mockImplementation(() => undefined);

function chain(table: string) {
  const node: Record<string, unknown> = {};
  let error: { code?: string } | null = null;
  const settle = () => Object.assign(Promise.resolve({ data: [], error }), node);
  for (const method of ["select", "order"]) node[method] = settle;
  node.eq = () => settle();
  node.update = (values: unknown) => {
    state.updates.push({ table, values });
    error = state.updateErrors.shift() ?? null;
    return node;
  };
  node.range = (from: number) => {
    state.termRangeCalls.push(from);
    return Promise.resolve({ data: state.terms.slice(from, from + 1000), error: null });
  };
  node.single = () =>
    Promise.resolve(error ? { data: null, error } : { data: { id: "d1" }, error: null });
  return node;
}

vi.mock("@/lib/auth/require-session", () => ({
  requireAdminClient: async () => ({
    user: { id: "admin-1" },
    supabase: {
      from: (table: string) => chain(table),
      rpc: (name: string, args: unknown) => {
        state.rpcCalls.push({ name, args });
        if (name === "admin_list_collections") {
          return Promise.resolve({ data: state.list, error: null });
        }
        return Promise.resolve(state.publishResults.shift() ?? { data: "cooking", error: null });
      },
    },
  }),
}));

const { checkDomainSlug, setCollectionStatus, updateDomainSlug } = await import("./actions");

const domain = (overrides: Record<string, unknown> = {}) => ({
  id: "d1",
  name: "Cooking",
  slug: null,
  is_builtin: true,
  is_public: false,
  owner_id: "admin-1",
  owner_email: "admin@example.test",
  visibility: "private",
  term_count: 2,
  updated_at: "2026-09-29T00:00:00Z",
  ...overrides,
});

const theirs = (overrides: Record<string, unknown> = {}) =>
  domain({ owner_id: "someone", visibility: "private", ...overrides });

const publishCalls = () =>
  state.rpcCalls.filter((call) => call.name === "admin_publish_collection");
const listCalls = () => state.rpcCalls.filter((call) => call.name === "admin_list_collections");

beforeEach(() => {
  state.list = [domain(), domain({ id: "d2", name: "Baking", slug: "baking" })];
  state.terms = [
    { id: "t1", term: "Roux", slug: null },
    { id: "t2", term: "Roux!", slug: null },
  ];
  state.publishResults = [];
  state.rpcCalls = [];
  state.updates = [];
  state.updateErrors = [];
  state.revalidated = [];
  state.termRangeCalls = [];
});

describe("setCollectionStatus: moves, decided from the database's status", () => {
  it("marks built-in with one update", async () => {
    state.list = [domain({ is_builtin: false })];
    expect(await setCollectionStatus("d1", "builtin")).toMatchObject({ ok: true });
    expect(state.updates).toEqual([{ table: "domains", values: { is_builtin: true } }]);
    expect(publishCalls()).toEqual([]);
  });

  it("marks built-in first, then publishes, from not built-in", async () => {
    state.list = [domain({ is_builtin: false })];
    expect(await setCollectionStatus("d1", "published")).toEqual({
      ok: true,
      data: { slug: "cooking" },
    });
    expect(state.updates).toEqual([{ table: "domains", values: { is_builtin: true } }]);
    expect(publishCalls()).toHaveLength(1);
  });

  it("publishes with one call carrying the slugs it built", async () => {
    await setCollectionStatus("d1", "published");
    expect(publishCalls()).toEqual([
      {
        name: "admin_publish_collection",
        args: {
          p_domain_id: "d1",
          p_domain_slug: "cooking",
          p_term_slugs: { t1: "roux", t2: "roux-2" },
        },
      },
    ]);
    expect(listCalls()).toHaveLength(1);
  });

  it("takes a published collection back to built-in without un-building it", async () => {
    state.list = [domain({ slug: "cooking", is_public: true })];
    await setCollectionStatus("d1", "builtin");
    expect(state.updates).toEqual([{ table: "domains", values: { is_public: false } }]);
    expect(state.revalidated).toEqual(
      expect.arrayContaining(["/j/cooking:layout", "/j", "/sitemap.xml", "/admin/collections"]),
    );
  });

  it("un-builds and clears public in one update", async () => {
    state.list = [domain({ slug: "cooking", is_public: true })];
    await setCollectionStatus("d1", "none");
    expect(state.updates).toEqual([
      { table: "domains", values: { is_builtin: false, is_public: false } },
    ]);
  });

  it("does nothing, and says ok, when the collection is already there", async () => {
    state.list = [domain({ slug: "cooking", is_public: true })];
    expect(await setCollectionStatus("d1", "published")).toMatchObject({ ok: true });
    expect(state.updates).toEqual([]);
    expect(publishCalls()).toEqual([]);
  });

  it("stays built-in, and reports the failure, when publishing fails after marking built-in", async () => {
    state.list = [domain({ is_builtin: false })];
    state.publishResults = [{ data: null, error: { code: "P0001", message: "internal" } }];
    expect(await setCollectionStatus("d1", "published")).toEqual({
      ok: false,
      error: "The collection was marked built-in, but publishing failed. Try again.",
    });
    expect(state.updates).toEqual([{ table: "domains", values: { is_builtin: true } }]);
    // The page must show it as built-in now, not as it was.
    expect(state.revalidated).toContain("/admin/collections");
  });

  it("stops before publishing when marking built-in fails", async () => {
    state.list = [domain({ is_builtin: false })];
    state.updateErrors = [{ code: "42501" }];
    expect((await setCollectionStatus("d1", "published")).ok).toBe(false);
    expect(publishCalls()).toEqual([]);
  });

  it("avoids slugs used by other collections", async () => {
    state.list = [domain(), domain({ id: "d2", slug: "cooking" })];
    await setCollectionStatus("d1", "published");
    expect(publishCalls()[0]?.args).toMatchObject({ p_domain_slug: "cooking-2" });
  });

  it("reads again and retries once on a taken slug or a new term", async () => {
    state.publishResults = [{ data: null, error: { code: "23505" } }];
    expect((await setCollectionStatus("d1", "published")).ok).toBe(true);
    expect(publishCalls()).toHaveLength(2);
    expect(listCalls()).toHaveLength(2);

    state.rpcCalls = [];
    state.publishResults = [{ data: null, error: { code: "40001" } }];
    expect((await setCollectionStatus("d1", "published")).ok).toBe(true);
    expect(publishCalls()).toHaveLength(2);
  });

  it("gives up with a plain message after the second attempt", async () => {
    state.publishResults = [
      { data: null, error: { code: "23505" } },
      { data: null, error: { code: "23505" } },
    ];
    expect(await setCollectionStatus("d1", "published")).toEqual({
      ok: false,
      error: "Couldn't publish. Try again.",
    });
  });

  it("reads every page of terms", async () => {
    state.terms = Array.from({ length: 1500 }, (_, i) => ({
      id: `t${i}`,
      term: `word ${i}`,
      slug: null,
    }));
    await setCollectionStatus("d1", "published");
    expect(state.termRangeCalls).toEqual([0, 1000]);
    const sent = publishCalls()[0]?.args as { p_term_slugs: object } | undefined;
    expect(Object.keys(sent?.p_term_slugs ?? {})).toHaveLength(1500);
  });

  it("refuses an unknown status", async () => {
    expect((await setCollectionStatus("d1", "nope" as never)).ok).toBe(false);
    expect(state.updates).toEqual([]);
  });
});

describe("someone else's private collection", () => {
  beforeEach(() => {
    state.list = [theirs()];
  });

  it("can't be moved, checked or given an address, though the publish function would allow it", async () => {
    for (const result of [
      await setCollectionStatus("d1", "published"),
      await setCollectionStatus("d1", "none"),
      await checkDomainSlug("d1", "x"),
      await updateDomainSlug("d1", "x", "x"),
    ]) {
      expect(result).toEqual({ ok: false, error: "Collection not found." });
    }
    expect(state.updates).toEqual([]);
    expect(publishCalls()).toEqual([]);
  });

  it("can be moved when it is shared", async () => {
    state.list = [theirs({ visibility: "shared" })];
    expect((await setCollectionStatus("d1", "published")).ok).toBe(true);
    expect(publishCalls()).toHaveLength(1);
  });
});

describe("checkDomainSlug", () => {
  it("says free, taken with a suggestion, or invalid, without saving", async () => {
    expect(await checkDomainSlug("d1", "Fresh Name")).toMatchObject({
      ok: true,
      data: { slug: "fresh-name", taken: false },
    });
    expect(await checkDomainSlug("d1", "Baking")).toMatchObject({
      data: { taken: true, suggestion: "baking-2" },
    });
    expect(await checkDomainSlug("d1", "!!!")).toMatchObject({ data: { valid: false } });
    expect(state.updates).toEqual([]);
  });

  it("counts the collection's own slug as free", async () => {
    state.list = [domain({ slug: "cooking" })];
    expect(await checkDomainSlug("d1", "cooking")).toMatchObject({ data: { taken: false } });
  });
});

describe("updateDomainSlug", () => {
  it("saves exactly the address that was checked", async () => {
    expect(await updateDomainSlug("d1", "Kitchen", "kitchen")).toEqual({
      ok: true,
      data: { slug: "kitchen" },
    });
    expect(state.updates).toEqual([{ table: "domains", values: { slug: "kitchen" } }]);
  });

  it("refuses, instead of suffixing, when the address is taken or was taken in the meantime", async () => {
    expect(await updateDomainSlug("d1", "Baking", "baking")).toEqual({
      ok: false,
      error: "That address is taken. Check again.",
    });
    state.updateErrors = [{ code: "23505" }];
    expect(await updateDomainSlug("d1", "Kitchen", "kitchen")).toEqual({
      ok: false,
      error: "That address is taken. Check again.",
    });
  });

  it("refuses when the text isn't what was checked, or has no letters", async () => {
    expect(await updateDomainSlug("d1", "Kitchen", "cooking")).toEqual({
      ok: false,
      error: "The address changed. Check it again.",
    });
    expect(await updateDomainSlug("d1", "!!!", "item")).toEqual({
      ok: false,
      error: "Use letters or numbers in the address.",
    });
    expect(state.updates).toEqual([]);
  });

  it("gives an address only to built-in collections, or ones that already have one", async () => {
    state.list = [domain({ is_builtin: false })];
    expect(await updateDomainSlug("d1", "kitchen", "kitchen")).toEqual({
      ok: false,
      error: "Only built-in collections have a public address.",
    });
    state.list = [domain({ is_builtin: false, slug: "old" })];
    expect((await updateDomainSlug("d1", "kitchen", "kitchen")).ok).toBe(true);
  });

  it("refreshes the old and new public pages when the collection is public", async () => {
    state.list = [domain({ slug: "cooking", is_public: true })];
    await updateDomainSlug("d1", "kitchen", "kitchen");
    expect(state.revalidated).toEqual(
      expect.arrayContaining(["/j/cooking:layout", "/j/kitchen:layout", "/j"]),
    );
  });
});
