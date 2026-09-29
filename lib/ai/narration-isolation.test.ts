import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FORBIDDEN = [
  "reserve_ai_credits",
  "refund_ai_credits",
  "ai_credit_ledger",
  "ai-credits",
  "runMetered",
  "runWithCredits",
];

function narrationFiles(): string[] {
  const dir = "lib/narration";
  const inDir = readdirSync(dir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => `${dir}/${name}`);
  return [
    ...inDir,
    "lib/stories/narration.ts",
    "app/(private)/admin/narration/actions.ts",
    "lib/ai/usage.ts",
  ];
}

describe("narration is never billed", () => {
  it("does not touch credits or the ledger", () => {
    for (const file of narrationFiles()) {
      const source = readFileSync(file, "utf8");
      for (const word of FORBIDDEN) {
        expect(source.includes(word), `${file} mentions ${word}`).toBe(false);
      }
    }
  });
});
