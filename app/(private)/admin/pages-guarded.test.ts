import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function findPages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findPages(path);
    return entry.name === "page.tsx" ? [path] : [];
  });
}

describe("admin pages", () => {
  const pages = findPages(__dirname);

  it("finds the pages", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages)("%s checks for an admin itself", (page) => {
    expect(readFileSync(page, "utf8")).toMatch(/await requireAdminPage\(\)/);
  });
});
