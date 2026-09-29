import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  domain: { id: "d1", name: "Cooking", slug: "cooking", is_builtin: true } as Record<
    string,
    unknown
  >,
  otherSlugs: [] as { slug: string }[],
  updates: [] as unknown[],
  revalidated: [] as string[],
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) =>
    state.revalidated.push(type ? `${path}:${type}` : path),
}));
vi.spyOn(console, "error").mockImplementation(() => undefined);

vi.mock("@/lib/auth/require-session", async () => {
  return {
    requireAdminClient: async () => ({
      user: { id: "admin-1" },
      supabase: {
        from: (table: string) => {
          const node: Record<string, unknown> = {};
          const settle = () =>
            Object.assign(
              Promise.resolve({ data: table === "domains" ? state.otherSlugs : [], error: null }),
              node,
            );
          for (const method of ["select", "eq", "neq", "not"]) node[method] = settle;
          node.update = (values: unknown) => {
            state.updates.push({ table, values });
            return node;
          };
          node.single = () => Promise.resolve({ data: state.domain, error: null });
          return node;
        },
      },
    }),
  };
});

const { setBuiltin, setPublic, updateDomainSlug } = await import("./actions");

beforeEach(() => {
  state.domain = { id: "d1", name: "Cooking", slug: "cooking", is_builtin: true };
  state.otherSlugs = [];
  state.updates = [];
  state.revalidated = [];
});

describe("collection admin actions", () => {
  it("takes the public page and sitemap offline when a collection stops being built-in", async () => {
    expect(await setBuiltin("d1", false)).toMatchObject({ ok: true });
    expect(state.updates).toEqual([
      { table: "domains", values: { is_builtin: false, is_public: false } },
    ]);
    expect(state.revalidated).toEqual(["/admin/collections", "/j/cooking:layout", "/sitemap.xml"]);
  });

  it("does not touch public pages when a collection becomes built-in", async () => {
    await setBuiltin("d1", true);
    expect(state.revalidated).toEqual(["/admin/collections"]);
  });

  it("only publishes built-in collections, with a message that survives production", async () => {
    state.domain = { ...state.domain, is_builtin: false };
    expect(await setPublic("d1", true)).toEqual({
      ok: false,
      error: "Only built-in collections can be made public.",
    });
    expect(state.updates).toEqual([]);
  });

  it("publishes a built-in collection and returns its slug", async () => {
    expect(await setPublic("d1", true)).toEqual({ ok: true, data: { slug: "cooking" } });
    expect(state.revalidated).toContain("/j/cooking:layout");
  });

  it("returns the slug it actually saved", async () => {
    state.otherSlugs = [{ slug: "cooking" }];
    const result = await updateDomainSlug("d1", "Cooking");
    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.data.slug).not.toBe("cooking");
  });
});
