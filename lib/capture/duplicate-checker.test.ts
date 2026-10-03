import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDuplicateChecker, type DuplicateMatch } from "./duplicate-checker";

const hit: DuplicateMatch = { term: "SLA", finished: true };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(lookup: (d: string, t: string) => Promise<DuplicateMatch | null>) {
  const results: (DuplicateMatch | null)[] = [];
  const check = createDuplicateChecker(lookup, (m) => results.push(m), 300);
  return { check, results };
}

describe("createDuplicateChecker", () => {
  it("waits for the pause, then reports the match", async () => {
    const lookup = vi.fn().mockResolvedValue(hit);
    const { check, results } = setup(lookup);
    check("d", " SLA ");
    expect(lookup).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(lookup).toHaveBeenCalledWith("d", "SLA");
    expect(results).toEqual([null, hit]);
  });

  it("clears the shown answer as soon as the text changes", () => {
    const { check, results } = setup(vi.fn().mockResolvedValue(hit));
    check("d", "SLA");
    check("d", "SLAs");
    expect(results).toEqual([null, null]);
  });

  it("only runs the last of several quick edits", async () => {
    const lookup = vi.fn().mockResolvedValue(null);
    const { check } = setup(lookup);
    check("d", "a");
    check("d", "ab");
    await vi.advanceTimersByTimeAsync(300);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith("d", "ab");
  });

  it("drops a slow answer that a newer edit replaced", async () => {
    let resolveFirst: (m: DuplicateMatch | null) => void = () => {};
    const lookup = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce(null);
    const { check, results } = setup(lookup);
    check("d", "SLA");
    await vi.advanceTimersByTimeAsync(300);
    check("d", "other");
    resolveFirst(hit);
    await vi.advanceTimersByTimeAsync(300);
    expect(results).not.toContainEqual(hit);
    expect(results.at(-1)).toBeNull();
  });

  it("shows nothing when the lookup throws", async () => {
    const { check, results } = setup(vi.fn().mockRejectedValue(new Error("offline")));
    check("d", "SLA");
    await vi.advanceTimersByTimeAsync(300);
    expect(results.at(-1)).toBeNull();
  });

  it("does nothing without a collection or a term", async () => {
    const lookup = vi.fn();
    const { check } = setup(lookup);
    check(null, "SLA");
    check("d", "  ");
    await vi.advanceTimersByTimeAsync(300);
    expect(lookup).not.toHaveBeenCalled();
  });
});
