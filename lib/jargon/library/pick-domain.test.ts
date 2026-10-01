import { describe, expect, it } from "vitest";
import { pickLibraryDomainId } from "./pick-domain";

const domains = [
  { id: "paused", isActiveForReview: false },
  { id: "active", isActiveForReview: true },
  { id: "other", isActiveForReview: true },
];

describe("pickLibraryDomainId", () => {
  it("prefers the requested collection, then the last viewed one", () => {
    expect(
      pickLibraryDomainId(domains, { requestedDomainId: "other", lastDomainId: "paused" }),
    ).toBe("other");
    expect(pickLibraryDomainId(domains, { lastDomainId: "paused" })).toBe("paused");
  });

  it("ignores ids the user doesn't have and falls back to the first active", () => {
    expect(pickLibraryDomainId(domains, { requestedDomainId: "gone", lastDomainId: "gone" })).toBe(
      "active",
    );
  });

  it("uses the first collection when none is active, and nothing when there are none", () => {
    expect(pickLibraryDomainId([{ id: "a", isActiveForReview: false }], {})).toBe("a");
    expect(pickLibraryDomainId([], {})).toBeUndefined();
  });
});
