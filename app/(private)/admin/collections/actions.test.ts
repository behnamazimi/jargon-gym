import { beforeEach, describe, expect, it, vi } from "vitest";

type RpcResult = { data?: unknown; error?: { code?: string; message?: string } | null };

const state = vi.hoisted(() => ({
  list: [] as Record<string, unknown>[],
  terms: [] as { id: string; term: string; slug: string | null }[],
  publishResults: [] as RpcResult[],
  rpcCalls: [] as { name: string; args: unknown }[],
  updates: [] as unknown[],
  updateError: null as { code?: string } | null,
  updatedSlug: "cooking" as string | null,
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
  const self = () => node;
  for (const method of ["select", "eq", "order"]) node[method] = self;
  node.update = (values: unknown) => {
    state.updates.push({ table, values });
    return node;
  };
  node.range = (from: number) => {
    state.termRangeCalls.push(from);
    return Promise.resolve({ data: state.terms.slice(from, from + 1000), error: null });
  };
  node.single = () =>
    Promise.resolve(
      state.updateError
        ? { data: null, error: state.updateError }
        : { data: { slug: state.updatedSlug, id: "d1" }, error: null },
    );
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

const { setBuiltin, setPublic, updateDomainSlug } = await import("./actions");

const domain = (overrides: Record<string, unknown> = {}) => ({
  id: "d1",
  name: "Cooking",
  slug: null,
  is_builtin: true,
  ...overrides,
});

const publishCalls = () =>
  state.rpcCalls.filter((call) => call.name === "admin_publish_collection");

beforeEach(() => {
  state.list = [domain(), domain({ id: "d2", name: "Baking", slug: "baking" })];
  state.terms = [
    { id: "t1", term: "Roux", slug: null },
    { id: "t2", term: "Roux!", slug: null },
  ];
  state.publishResults = [];
  state.rpcCalls = [];
  state.updates = [];
  state.updateError = null;
  state.updatedSlug = "cooking";
  state.revalidated = [];
  state.termRangeCalls = [];
});

describe("setBuiltin", () => {
  it("takes the public page and sitemap offline when a collection stops being built-in", async () => {
    expect(await setBuiltin("d1", false)).toMatchObject({ ok: true });
    expect(state.updates).toEqual([
      { table: "domains", values: { is_builtin: false, is_public: false } },
    ]);
    expect(state.revalidated).toEqual(["/admin/collections", "/j/cooking:layout", "/sitemap.xml"]);
  });

  it("does not touch public pages when a collection becomes built-in", async () => {
    state.updatedSlug = null;
    await setBuiltin("d1", true);
    expect(state.revalidated).toEqual(["/admin/collections"]);
  });
});

describe("setPublic", () => {
  it("publishes with one call carrying the slugs it built", async () => {
    expect(await setPublic("d1", true)).toEqual({ ok: true, data: { slug: "cooking" } });
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
    expect(state.revalidated).toContain("/j/cooking:layout");
  });

  it("avoids slugs used by other collections, and keeps the domain's own slug", async () => {
    state.list = [domain({ slug: "cooking" }), domain({ id: "d2", slug: "baking" })];
    await setPublic("d1", true);
    expect(publishCalls()[0]?.args).toMatchObject({ p_domain_slug: "cooking" });

    state.rpcCalls = [];
    state.list = [domain(), domain({ id: "d2", slug: "cooking" })];
    await setPublic("d1", true);
    expect(publishCalls()[0]?.args).toMatchObject({ p_domain_slug: "cooking-2" });
  });

  it("only publishes built-in collections, with a message that survives production", async () => {
    state.list = [domain({ is_builtin: false })];
    expect(await setPublic("d1", true)).toEqual({
      ok: false,
      error: "Only built-in collections can be made public.",
    });
    expect(publishCalls()).toEqual([]);
  });

  it("reads again and retries once when a slug was taken meanwhile", async () => {
    state.publishResults = [{ data: null, error: { code: "23505" } }];
    expect(await setPublic("d1", true)).toEqual({ ok: true, data: { slug: "cooking" } });
    expect(publishCalls()).toHaveLength(2);
    expect(state.rpcCalls.filter((call) => call.name === "admin_list_collections")).toHaveLength(2);
  });

  it("reads again and retries once when a term appeared meanwhile", async () => {
    state.publishResults = [{ data: null, error: { code: "40001" } }];
    expect((await setPublic("d1", true)).ok).toBe(true);
    expect(publishCalls()).toHaveLength(2);
  });

  it("gives up with a plain message after the second attempt", async () => {
    state.publishResults = [
      { data: null, error: { code: "23505" } },
      { data: null, error: { code: "23505" } },
    ];
    expect(await setPublic("d1", true)).toEqual({
      ok: false,
      error: "Couldn't publish. Try again.",
    });
    expect(publishCalls()).toHaveLength(2);
  });

  it("does not retry other errors, and shows a generic message", async () => {
    state.publishResults = [{ data: null, error: { code: "P0001", message: "internal detail" } }];
    expect(await setPublic("d1", true)).toEqual({
      ok: false,
      error: "Something went wrong. Try again.",
    });
    expect(publishCalls()).toHaveLength(1);
  });

  it("reads every page of terms", async () => {
    state.terms = Array.from({ length: 1500 }, (_, i) => ({
      id: `t${i}`,
      term: `word ${i}`,
      slug: null,
    }));
    await setPublic("d1", true);
    expect(state.termRangeCalls).toEqual([0, 1000]);
    const sent = publishCalls()[0]?.args as { p_term_slugs: object } | undefined;
    expect(Object.keys(sent?.p_term_slugs ?? {})).toHaveLength(1500);
  });

  it("unpublishes with a direct update and takes the page offline", async () => {
    expect(await setPublic("d1", false)).toEqual({ ok: true, data: { slug: "cooking" } });
    expect(state.updates).toEqual([{ table: "domains", values: { is_public: false } }]);
    expect(publishCalls()).toEqual([]);
    expect(state.revalidated).toContain("/j/cooking:layout");
  });
});

describe("updateDomainSlug", () => {
  it("returns the slug it saved, never one another collection has", async () => {
    const result = await updateDomainSlug("d1", "Baking");
    expect(result).toEqual({ ok: true, data: { slug: "baking-2" } });
  });

  it("can keep its own slug", async () => {
    state.list = [domain({ slug: "cooking" })];
    expect(await updateDomainSlug("d1", "cooking")).toEqual({
      ok: true,
      data: { slug: "cooking" },
    });
  });

  it("says so when the slug was taken in between", async () => {
    state.updateError = { code: "23505" };
    expect(await updateDomainSlug("d1", "fresh")).toEqual({
      ok: false,
      error: "That slug is taken. Try another.",
    });
  });
});
