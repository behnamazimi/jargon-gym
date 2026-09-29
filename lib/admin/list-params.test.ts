import { describe, expect, it } from "vitest";
import { clampPage, pageBounds, parsePeopleParams, peopleHref } from "./list-params";

describe("parsePeopleParams", () => {
  it("defaults to the pending waitlist, page one", () => {
    expect(parsePeopleParams({})).toEqual({
      view: "waitlist",
      status: "pending",
      q: "",
      page: 1,
      person: null,
    });
  });

  it("accepts known values and ignores unknown ones", () => {
    expect(parsePeopleParams({ view: "members", status: "all", page: "3" })).toMatchObject({
      view: "members",
      status: "all",
      page: 3,
    });
    expect(parsePeopleParams({ view: "x", status: "signed_up", page: "-2" })).toMatchObject({
      view: "waitlist",
      status: "pending",
      page: 1,
    });
  });

  it("takes the first of repeated values", () => {
    expect(parsePeopleParams({ q: ["a", "b"], page: ["2", "9"] })).toMatchObject({
      q: "a",
      page: 2,
    });
  });

  it("trims, strips control characters and caps the search", () => {
    expect(parsePeopleParams({ q: "  a\u0000b\n " }).q).toBe("ab");
    expect(parsePeopleParams({ q: "x".repeat(300) }).q).toHaveLength(100);
  });

  it("keeps an absurd page number bounded and only accepts a uuid as a person", () => {
    expect(parsePeopleParams({ page: "99999999999" }).page).toBe(100_000);
    expect(parsePeopleParams({ person: "nope" }).person).toBeNull();
    const id = "3f2b8c1e-0a4d-4c55-9d1e-7a6b5c4d3e2f";
    expect(parsePeopleParams({ person: id }).person).toBe(id);
  });
});

describe("paging", () => {
  it("clamps to the last page with rows, and to 1 when there are none", () => {
    expect(clampPage(9, 60)).toBe(3);
    expect(clampPage(2, 60)).toBe(2);
    expect(clampPage(5, 0)).toBe(1);
  });

  it("describes the rows shown", () => {
    expect(pageBounds(2, 60)).toEqual({ from: 25, to: 50 });
    expect(pageBounds(3, 60)).toEqual({ from: 50, to: 60 });
  });
});

describe("peopleHref", () => {
  it("keeps only what is set", () => {
    expect(peopleHref({})).toBe("/admin/people");
    expect(peopleHref({ view: "members", q: "a b", page: 2 })).toBe(
      "/admin/people?view=members&q=a+b&page=2",
    );
    expect(peopleHref({ status: "invited" })).toBe("/admin/people?status=invited");
  });
});
