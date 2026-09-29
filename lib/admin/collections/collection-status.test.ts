import { describe, expect, it } from "vitest";
import {
  needsOfflineConfirm,
  statusOf,
  stepsFor,
  type CollectionStatus,
} from "./collection-status";

describe("statusOf", () => {
  it("turns the two flags into one status", () => {
    expect(statusOf({ isBuiltin: false, isPublic: false })).toBe("none");
    expect(statusOf({ isBuiltin: true, isPublic: false })).toBe("builtin");
    expect(statusOf({ isBuiltin: true, isPublic: true })).toBe("published");
  });
});

describe("stepsFor", () => {
  it("does nothing when the status doesn't change", () => {
    for (const status of ["none", "builtin", "published"] as const) {
      expect(stepsFor(status, status)).toEqual([]);
    }
  });

  it("marks built-in before publishing, and publishes through the function", () => {
    expect(stepsFor("none", "published")).toEqual([
      { kind: "update", values: { is_builtin: true } },
      { kind: "publish" },
    ]);
    expect(stepsFor("builtin", "published")).toEqual([{ kind: "publish" }]);
  });

  it("stops being public without un-building when going back to built-in", () => {
    expect(stepsFor("published", "builtin")).toEqual([
      { kind: "update", values: { is_public: false } },
    ]);
  });

  it("clears public in the same update that un-builds, never in a second one", () => {
    for (const from of ["builtin", "published"] as const) {
      expect(stepsFor(from, "none")).toEqual([
        { kind: "update", values: { is_builtin: false, is_public: false } },
      ]);
    }
  });

  it("never leaves a public collection that isn't built-in between two steps", () => {
    const states: CollectionStatus[] = ["none", "builtin", "published"];
    for (const from of states) {
      for (const to of states) {
        let flags = { is_builtin: from !== "none", is_public: from === "published" };
        for (const step of stepsFor(from, to)) {
          if (step.kind === "update") flags = { ...flags, ...step.values };
          else flags = { ...flags, is_public: true };
          expect(!flags.is_public || flags.is_builtin, `${from} to ${to}`).toBe(true);
        }
      }
    }
  });
});

describe("needsOfflineConfirm", () => {
  it("asks only when a published collection stops being published", () => {
    expect(needsOfflineConfirm("published", "builtin")).toBe(true);
    expect(needsOfflineConfirm("published", "none")).toBe(true);
    expect(needsOfflineConfirm("builtin", "none")).toBe(false);
    expect(needsOfflineConfirm("none", "published")).toBe(false);
  });
});
