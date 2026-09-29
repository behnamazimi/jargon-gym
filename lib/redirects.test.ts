import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEGACY_ADMIN_REDIRECTS } from "./redirects";

describe("legacy admin redirects", () => {
  it("send every old address to a page that exists", () => {
    for (const { destination } of LEGACY_ADMIN_REDIRECTS) {
      expect(existsSync(`app/(private)${destination.split("?")[0]}/page.tsx`), destination).toBe(
        true,
      );
    }
  });

  it("are temporary, so reverting doesn't leave cached redirects in browsers", () => {
    expect(LEGACY_ADMIN_REDIRECTS.every((redirect) => !redirect.permanent)).toBe(true);
  });

  it("only match the old address exactly, not the new ones", () => {
    const sources = LEGACY_ADMIN_REDIRECTS.map((redirect) => redirect.source);
    expect(sources).not.toContain("/admin/ai/credits");
    expect(sources).not.toContain("/admin/ai");
  });

  it("don't send anything to another old address", () => {
    const sources = new Set(LEGACY_ADMIN_REDIRECTS.map((redirect) => redirect.source));
    for (const { destination } of LEGACY_ADMIN_REDIRECTS)
      expect(sources.has(destination)).toBe(false);
  });
});
