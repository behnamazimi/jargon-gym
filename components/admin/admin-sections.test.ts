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
    expect(isSectionActive("/admin/invites", overview)).toBe(false);
  });

  it("highlights a section for its own path and paths below it, not lookalikes", () => {
    const collections = bySection("/admin/collections");
    expect(isSectionActive("/admin/collections", collections)).toBe(true);
    expect(isSectionActive("/admin/collections/abc", collections)).toBe(true);
    expect(isSectionActive("/admin/collections-archive", collections)).toBe(false);
  });

  it("honours extra prefixes", () => {
    const section = {
      href: "/admin/ai",
      label: "AI",
      icon: sections[0]!.icon,
      matchPrefixes: ["/admin/narration"],
    };
    expect(isSectionActive("/admin/narration", section)).toBe(true);
  });
});
