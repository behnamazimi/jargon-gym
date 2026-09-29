import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** The admin code moved out of `lib/jargon` and `components/jargon`; this keeps the old folders gone. */
const OLD_PATH = /@\/(lib|components)\/jargon\/admin\b/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes("no-legacy-paths") ? [path] : [];
  });
}

describe("admin folders", () => {
  it("no longer exist under lib/jargon or components/jargon", () => {
    expect(existsSync("lib/jargon/admin")).toBe(false);
    expect(existsSync("components/jargon/admin")).toBe(false);
  });

  it("are not imported from their old paths", () => {
    const offenders = ["app", "components", "lib", "hooks"]
      .flatMap(sourceFiles)
      .filter((file) => OLD_PATH.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
