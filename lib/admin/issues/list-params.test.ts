import { describe, expect, it } from "vitest";
import { issuesHref, parseIssueParams } from "./list-params";

describe("parseIssueParams", () => {
  const cases: [string, Record<string, string | string[] | undefined>, unknown][] = [
    ["defaults", {}, { tab: "open", kind: "all", page: 1 }],
    ["known values", { tab: "wont_do", kind: "idea" }, { tab: "wont_do", kind: "idea", page: 1 }],
    ["unknown values", { tab: "nope", kind: "bug" }, { tab: "open", kind: "all", page: 1 }],
    ["a bad page", { page: "-3" }, { tab: "open", kind: "all", page: 1 }],
    [
      "repeated params take the first",
      { tab: ["done", "open"] },
      { tab: "done", kind: "all", page: 1 },
    ],
  ];

  it.each(cases)("%s", (_name, raw, expected) => {
    expect(parseIssueParams(raw)).toEqual(expected);
  });
});

describe("issuesHref", () => {
  it("keeps only what is set", () => {
    expect(issuesHref({ tab: "open", kind: "all", page: 1 })).toBe("/admin/issues");
    expect(issuesHref({ tab: "done", kind: "problem", page: 2 })).toBe(
      "/admin/issues?tab=done&kind=problem&page=2",
    );
  });
});
