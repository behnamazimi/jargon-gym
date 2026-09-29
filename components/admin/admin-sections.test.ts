import { describe, expect, it } from "vitest";
import { ADMIN_SECTION_GROUPS, isSectionActive } from "./admin-sections";

const sections = ADMIN_SECTION_GROUPS.flatMap((group) => group.sections);
const bySection = (href: string) => sections.find((section) => section.href === href)!;

describe("admin sections", () => {
  it("has one entry per href", () => {
    const hrefs = sections.map((section) => section.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("highlights Overview only on /admin", () => {
    const overview = bySection("/admin");
    expect(isSectionActive("/admin", overview)).toBe(true);
    expect(isSectionActive("/admin/", overview)).toBe(true);
    expect(isSectionActive("/admin/people", overview)).toBe(false);
  });

  it("highlights a section for its own path and paths below it, not lookalikes", () => {
    const collections = bySection("/admin/collections");
    expect(isSectionActive("/admin/collections", collections)).toBe(true);
    expect(isSectionActive("/admin/collections/abc", collections)).toBe(true);
    expect(isSectionActive("/admin/collections-archive", collections)).toBe(false);
  });

  it("keeps the AI features page apart from its sub-pages", () => {
    const hub = bySection("/admin/ai");
    expect(isSectionActive("/admin/ai", hub)).toBe(true);
    expect(isSectionActive("/admin/ai/credits", hub)).toBe(false);
    expect(isSectionActive("/admin/ai/credits", bySection("/admin/ai/credits"))).toBe(true);
    expect(isSectionActive("/admin/ai/narration", bySection("/admin/ai/narration"))).toBe(true);
  });

  it("honours extra prefixes", () => {
    const section = {
      href: "/admin/x",
      label: "X",
      icon: sections[0]!.icon,
      matchPrefixes: ["/admin/y"],
    };
    expect(isSectionActive("/admin/y/z", section)).toBe(true);
  });
});
