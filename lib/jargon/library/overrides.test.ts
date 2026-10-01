import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectionCountsOverride,
  overrideCollectionCounts,
  overrideMarkedKnown,
  resetLibraryOverrides,
  snapshotSeenAt,
  termOverride,
} from "./overrides";

// The store is read through useSyncExternalStore in components; here its
// precedence rules are checked directly against a captured state.
let current: Parameters<typeof termOverride>[0];
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
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    resetLibraryOverrides();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies an edit to the snapshot it was made on", async () => {
    const seenAt = snapshotSeenAt("d1:500");
    vi.setSystemTime(2_000);
    overrideMarkedKnown("t1", true);
    current = await readState();
    expect(termOverride(current, "t1", seenAt)?.marked).toBe(true);
  });

  it("keeps applying it when an older snapshot comes back (back/forward)", async () => {
    snapshotSeenAt("d1:500");
    vi.setSystemTime(2_000);
    overrideMarkedKnown("t1", true);
    vi.setSystemTime(3_000);
    // Same snapshot key as before: first seen at 1000, before the edit.
    current = await readState();
    expect(termOverride(current, "t1", snapshotSeenAt("d1:500"))?.marked).toBe(true);
  });

  it("lets a snapshot first seen after the edit win", async () => {
    overrideMarkedKnown("t1", true);
    vi.setSystemTime(2_000);
    const seenAt = snapshotSeenAt("d1:1500");
    current = await readState();
    expect(termOverride(current, "t1", seenAt)).toBeUndefined();
  });

  it("treats collection counts the same way", async () => {
    const seenAt = snapshotSeenAt("collections:1");
    vi.setSystemTime(2_000);
    overrideCollectionCounts("d1", { termCount: 3, knownCount: 2, termsLearnedCount: 1 });
    current = await readState();
    expect(collectionCountsOverride(current, "d1", seenAt)).toMatchObject({ knownCount: 2 });
    vi.setSystemTime(3_000);
    expect(
      collectionCountsOverride(current, "d1", snapshotSeenAt("collections:2")),
    ).toBeUndefined();
  });
});
