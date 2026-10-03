import { describe, expect, it, vi } from "vitest";
import type { ImportDestination } from "@/lib/import/import-collections";

vi.mock("@/app/(private)/app/import/actions", () => ({ commitImport: vi.fn() }));

const { initialDestination } = await import("./import-flow-helpers");

const collections: ImportDestination[] = [
  { id: "a", name: "A", language: "en", termCount: 1 },
  { id: "b", name: "B", language: "en", termCount: 2 },
];

describe("initialDestination", () => {
  it("starts in existing mode on the preset collection", () => {
    const result = initialDestination(undefined, collections[1], collections);
    expect(result.mode).toBe("existing");
    expect(result.existingId).toBe("b");
  });

  it("starts in new mode without a preset", () => {
    const result = initialDestination(undefined, undefined, collections);
    expect(result.mode).toBe("new");
    expect(result.existingId).toBe("a");
  });
});
