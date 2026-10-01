import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectionCountsOverride,
  overrideCollectionCounts,
  overrideMarkedKnown,
  overrideRemoved,
  resetLibraryOverrides,
  termOverride,
} from "./overrides";

// Components read the store through useSyncExternalStore; here the snapshot
// is read directly to check the precedence rules.
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useSyncExternalStore: (_: unknown, getSnapshot: () => unknown) => getSnapshot(),
}));

async function readState() {
  const { useLibraryOverrides } = await import("./overrides");
  return useLibraryOverrides();
}

describe("library overrides", () => {
  beforeEach(() => {
    resetLibraryOverrides();
  });

  it("lays an edit over a snapshot that started reading before it was saved", async () => {
    overrideMarkedKnown("t1", true, 2_000);
    const state = await readState();
    // The page it was made on, and an older one restored by back/forward.
    expect(termOverride(state, "t1", 1_500)?.marked).toBe(true);
    expect(termOverride(state, "t1", 500)?.marked).toBe(true);
  });

  it("lets a snapshot that started reading after the save win", async () => {
    overrideMarkedKnown("t1", true, 2_000);
    expect(termOverride(await readState(), "t1", 2_500)).toBeUndefined();
  });

  it("keeps the latest edit per term", async () => {
    overrideMarkedKnown("t1", true, 2_000);
    overrideMarkedKnown("t1", false, 3_000);
    overrideRemoved("t2", 3_000);
    const state = await readState();
    expect(termOverride(state, "t1", 2_500)?.marked).toBe(false);
    expect(termOverride(state, "t2", 2_500)?.removed).toBe(true);
  });

  it("treats collection counts the same way", async () => {
    overrideCollectionCounts("d1", {
      termCount: 3,
      knownCount: 2,
      termsLearnedCount: 1,
      savedAt: 2_000,
    });
    const state = await readState();
    expect(collectionCountsOverride(state, "d1", 1_000)).toMatchObject({ knownCount: 2 });
    expect(collectionCountsOverride(state, "d1", 3_000)).toBeUndefined();
  });
});
