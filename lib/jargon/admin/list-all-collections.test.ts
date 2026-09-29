import { describe, expect, it } from "vitest";
import { canActOnCollection, listAllCollectionsForAdmin } from "./list-all-collections";

const row = (overrides: Record<string, unknown>) => ({
  id: "d1",
  name: "Cooking",
  owner_id: "admin-1",
  owner_email: "a@example.test",
  visibility: "private",
  is_builtin: false,
  is_public: false,
  slug: null,
  term_count: 3,
  created_at: "",
  updated_at: "",
  ...overrides,
});

const client = (data: unknown[]) => ({ rpc: async () => ({ data, error: null }) }) as never;

describe("listAllCollectionsForAdmin", () => {
  it("maps rows, with nullable owner email and slug", async () => {
    const [result] = await listAllCollectionsForAdmin(
      client([row({ owner_email: null, slug: "", term_count: "7" })]),
      "admin-1",
    );
    expect(result).toMatchObject({ ownerEmail: null, slug: null, termCount: 7, readOnly: false });
  });

  it("marks only other people's private collections read-only", async () => {
    const rows = await listAllCollectionsForAdmin(
      client([
        row({ id: "own" }),
        row({ id: "shared", owner_id: "x", visibility: "shared" }),
        row({
          id: "theirs",
          owner_id: "x",
          visibility: "private",
          is_builtin: true,
          is_public: true,
        }),
      ]),
      "admin-1",
    );
    expect(rows.map((r) => [r.id, r.readOnly])).toEqual([
      ["own", false],
      ["shared", false],
      ["theirs", true],
    ]);
  });

  it("throws when the read fails", async () => {
    const failing = { rpc: async () => ({ data: null, error: new Error("x") }) } as never;
    await expect(listAllCollectionsForAdmin(failing, "admin-1")).rejects.toThrow("x");
  });
});

describe("canActOnCollection", () => {
  it("allows shared and own collections", () => {
    expect(canActOnCollection({ visibility: "shared", ownerId: "x" }, "a")).toBe(true);
    expect(canActOnCollection({ visibility: "private", ownerId: "a" }, "a")).toBe(true);
    expect(canActOnCollection({ visibility: "private", ownerId: "x" }, "a")).toBe(false);
  });
});
