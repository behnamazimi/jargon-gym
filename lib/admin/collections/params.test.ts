import { describe, expect, it } from "vitest";
import { collectionsHref, parseCollectionParams } from "./params";

describe("parseCollectionParams", () => {
  it("defaults to the built-in view, page one", () => {
    expect(parseCollectionParams({})).toEqual({ view: "builtin", q: "", page: 1 });
  });

  it("accepts the all view, cleans the search and bounds the page", () => {
    expect(parseCollectionParams({ view: "all", q: "  a\u0000b ", page: "3" })).toEqual({
      view: "all",
      q: "ab",
      page: 3,
    });
    expect(parseCollectionParams({ view: "x", page: "-1" })).toMatchObject({
      view: "builtin",
      page: 1,
    });
    expect(parseCollectionParams({ page: "99999999999" }).page).toBe(100_000);
  });
});

describe("collectionsHref", () => {
  it("keeps only what is set", () => {
    expect(collectionsHref({})).toBe("/admin/collections");
    expect(collectionsHref({ view: "all", q: "a b", page: 2 })).toBe(
      "/admin/collections?view=all&q=a+b&page=2",
    );
  });
});
