import { describe, expect, it } from "vitest";
import { parseRequestParams, requestsHref } from "./list-params";

describe("parseRequestParams", () => {
  const cases: [string, Record<string, string | string[] | undefined>, unknown][] = [
    ["defaults", {}, { tab: "open", q: "", page: 1 }],
    ["a known tab", { tab: "needs_input" }, { tab: "needs_input", q: "", page: 1 }],
    ["an unknown tab", { tab: "nope" }, { tab: "open", q: "", page: 1 }],
    ["a search is cleaned", { q: "  helm\u0007  " }, { tab: "open", q: "helm", page: 1 }],
    ["a bad page", { page: "-3" }, { tab: "open", q: "", page: 1 }],
    ["a huge page is capped", { page: "999999999" }, { tab: "open", q: "", page: 100000 }],
    ["repeated params take the first", { tab: ["done", "open"] }, { tab: "done", q: "", page: 1 }],
  ];

  it.each(cases)("%s", (_name, raw, expected) => {
    expect(parseRequestParams(raw)).toEqual(expected);
  });
});

describe("requestsHref", () => {
  it("keeps only what is set", () => {
    expect(requestsHref({})).toBe("/admin/requests");
    expect(requestsHref({ tab: "open", page: 1 })).toBe("/admin/requests");
    expect(requestsHref({ tab: "done", q: "helm", page: 2 })).toBe(
      "/admin/requests?tab=done&q=helm&page=2",
    );
  });
});
