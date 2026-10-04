import { describe, expect, it } from "vitest";
import {
  canActOnCollection,
  canNarrateCollection,
  listAllCollectionsForAdmin,
} from "./list-all-collections";

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
  love_count: 0,
  open_report_count: 0,
  share_blocked_at: null,
  share_block_reason: null,
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
    expect(result).toMatchObject({
      ownerEmail: null,
      slug: null,
      termCount: 7,
      readOnly: false,
    });
  });

  it("reads the kind, and treats a missing or unknown one as terms", async () => {
    const rows = await listAllCollectionsForAdmin(
      client([row({ id: "a", kind: "vocabulary" }), row({ id: "b" }), row({ id: "c", kind: "x" })]),
      "admin-1",
    );
    expect(rows.map((r) => r.kind)).toEqual(["vocabulary", "terms", "terms"]);
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
    const failing = {
      rpc: async () => ({ data: null, error: new Error("x") }),
    } as never;
    await expect(listAllCollectionsForAdmin(failing, "admin-1")).rejects.toThrow("x");
  });
});

describe("canActOnCollection", () => {
  it("allows shared and own collections", () => {
    expect(canActOnCollection({ visibility: "shared", ownerId: "x" }, "a")).toBe(true);
    expect(canActOnCollection({ visibility: "private", ownerId: "a" }, "a")).toBe(true);
    expect(canActOnCollection({ visibility: "private", ownerId: "x" }, "a")).toBe(false);
  });

  it("keeps a collection with open reports actable after its owner unshared it", () => {
    const reported = { visibility: "private", ownerId: "x", openReportCount: 2 };
    expect(canActOnCollection(reported, "a")).toBe(true);
  });

  it("keeps a blocked collection actable, so its lock can be lifted", () => {
    const blocked = {
      visibility: "private",
      ownerId: "x",
      shareBlockedAt: "2026-10-01T00:00:00Z",
    };
    expect(canActOnCollection(blocked, "a")).toBe(true);
  });
});

describe("canNarrateCollection", () => {
  it("allows what an admin can act on, and public collections, but not other private ones", () => {
    expect(canNarrateCollection({ readOnly: false, isPublic: false })).toBe(true);
    expect(canNarrateCollection({ readOnly: true, isPublic: true })).toBe(true);
    expect(canNarrateCollection({ readOnly: true, isPublic: false })).toBe(false);
  });
});
