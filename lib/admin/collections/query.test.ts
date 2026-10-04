import { describe, expect, it } from "vitest";
import type { AdminCollectionRow } from "@/lib/admin/collections/list-all-collections";
import { COLLECTION_LIST_LIMIT, queryCollections } from "./query";

const row = (id: string, overrides: Partial<AdminCollectionRow> = {}): AdminCollectionRow => ({
  id,
  name: `Collection ${id}`,
  ownerId: "o",
  ownerEmail: "owner@example.test",
  termCount: 1,
  isBuiltin: false,
  isPublic: false,
  kind: "terms",
  slug: null,
  visibility: "private",
  readOnly: false,
  updatedAt: "2026-09-29T00:00:00Z",
  ...overrides,
});

const rows = [
  row("a", { name: "Baking", isBuiltin: true }),
  row("b", { name: "Cooking", isBuiltin: true, isPublic: true, slug: "cooking" }),
  row("c", { name: "Archery", ownerEmail: null }),
  row("d", { name: "Cooking", isBuiltin: true }),
];

describe("queryCollections", () => {
  it("shows built-in collections, published first then by name", () => {
    const result = queryCollections(rows, { view: "builtin", q: "", page: 1 });
    expect(result.rows.map((r) => r.id)).toEqual(["b", "a", "d"]);
  });

  it("shows everyone's collections by name in the all view, with a stable tiebreak", () => {
    const result = queryCollections(rows, { view: "all", q: "", page: 1 });
    expect(result.rows.map((r) => r.id)).toEqual(["c", "a", "b", "d"]);
  });

  it("searches name, owner email and slug, case-insensitively and literally", () => {
    expect(queryCollections(rows, { view: "all", q: "COOK", page: 1 }).total).toBe(2);
    expect(queryCollections(rows, { view: "all", q: "owner@", page: 1 }).total).toBe(3);
    expect(queryCollections(rows, { view: "all", q: "cooking", page: 1 }).total).toBe(2);
    expect(queryCollections(rows, { view: "all", q: "%", page: 1 }).total).toBe(0);
  });

  it("pages, and clamps a page past the end", () => {
    const many = Array.from({ length: 60 }, (_, i) => row(String(i).padStart(3, "0")));
    const result = queryCollections(many, { view: "all", q: "", page: 9 });
    expect(result.page).toBe(3);
    expect(result.rows).toHaveLength(10);
    expect(result.total).toBe(60);
  });

  it("says the list may be cut when the function returned its limit", () => {
    const full = Array.from({ length: COLLECTION_LIST_LIMIT }, (_, i) => row(String(i)));
    expect(queryCollections(full, { view: "all", q: "", page: 1 }).truncated).toBe(true);
    expect(queryCollections(rows, { view: "all", q: "", page: 1 }).truncated).toBe(false);
  });
});
