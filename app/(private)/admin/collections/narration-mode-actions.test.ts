import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  admin: true,
  collections: [] as Record<string, unknown>[],
  mode: null as string | null,
  upserts: [] as unknown[],
  deletes: [] as string[],
  audits: [] as { action: string; targetId?: string; details?: unknown }[],
  revalidated: [] as string[],
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) =>
    state.revalidated.push(type ? `${path}:${type}` : path),
}));
vi.spyOn(console, "error").mockImplementation(() => undefined);

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
            }
            if (name === "admin_list_collections") {
              return Promise.resolve({ data: state.collections, error: null });
            }
            return Promise.resolve({ error: null });
          },
          from: () => ({
            select: () => ({
              in: async () => ({
                data: state.mode ? [{ domain_id: "mine", mode: state.mode }] : [],
                error: null,
              }),
            }),
            upsert: (row: unknown) => {
              state.upserts.push(row);
              return Promise.resolve({ error: null });
            },
            delete: () => ({
              eq: (_column: string, id: string) => {
                state.deletes.push(id);
                return Promise.resolve({ error: null });
              },
            }),
          }),
        },
      };
    },
  };
});

const { setNarrationMode } = await import("./narration-mode-actions");

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
  state.mode = null;
  state.upserts = [];
  state.deletes = [];
  state.audits = [];
  state.revalidated = [];
  state.collections = [
    collection("mine"),
    collection("theirs", { owner_id: "someone", visibility: "private" }),
  ];
});

describe("setNarrationMode", () => {
  it("saves full mode and records the change", async () => {
    expect(await setNarrationMode("mine", "full")).toEqual({ ok: true, data: { mode: "full" } });
    expect(state.upserts).toEqual([{ domain_id: "mine", mode: "full" }]);
    expect(state.audits).toEqual([
      {
        action: "app.narration_mode_set",
        targetId: "mine",
        details: { from: "term", to: "full", name: "Collection mine" },
      },
    ]);
    expect(state.revalidated).toContain("/admin/collections");
  });

  it("goes back to the default by removing the row", async () => {
    state.mode = "full";
    await setNarrationMode("mine", "term");
    expect(state.deletes).toEqual(["mine"]);
    expect(state.upserts).toEqual([]);
  });

  it("does nothing, and records nothing, when the mode is unchanged", async () => {
    await setNarrationMode("mine", "term");
    expect(state.upserts).toEqual([]);
    expect(state.deletes).toEqual([]);
    expect(state.audits).toEqual([]);
  });

  it("refuses another person's private collection and unknown ones", async () => {
    expect(await setNarrationMode("theirs", "full")).toEqual({
      ok: false,
      error: "Collection not found.",
    });
    expect(await setNarrationMode("nope", "full")).toMatchObject({ ok: false });
    expect(state.upserts).toEqual([]);
  });

  it("refuses a mode that does not exist and keeps non-admins out", async () => {
    expect(await setNarrationMode("mine", "loud" as never)).toMatchObject({ ok: false });
    state.admin = false;
    expect(await setNarrationMode("mine", "full")).toEqual({ ok: false, error: "Admins only." });
  });
});
