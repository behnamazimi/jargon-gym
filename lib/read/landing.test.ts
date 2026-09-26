import { describe, expect, it } from "vitest";
import { readLandingRedirect } from "./landing";

describe("readLandingRedirect", () => {
  it("stays on Cards with no story in progress and Stories not the default", () => {
    expect(
      readLandingRedirect({ params: {}, storiesDefault: false, hasCurrentStory: false }),
    ).toBeNull();
  });

  it("goes to Stories when a story is in progress", () => {
    expect(readLandingRedirect({ params: {}, storiesDefault: false, hasCurrentStory: true })).toBe(
      "/jargon/read/stories",
    );
  });

  it("goes to Stories when it's the default", () => {
    expect(readLandingRedirect({ params: {}, storiesDefault: true, hasCurrentStory: false })).toBe(
      "/jargon/read/stories",
    );
  });

  it("never leaves an explicit Cards visit or a single-term link", () => {
    for (const params of [
      { view: "cards" },
      { termId: "t1" },
      { termId: "t1", alreadyRead: "true" },
    ]) {
      expect(
        readLandingRedirect({ params, storiesDefault: true, hasCurrentStory: true }),
      ).toBeNull();
    }
  });

  it("carries the collection and other params, but not Cards-only ones", () => {
    expect(
      readLandingRedirect({
        params: { domain: "d1", source: "pwa", view: undefined },
        storiesDefault: true,
        hasCurrentStory: false,
      }),
    ).toBe("/jargon/read/stories?domain=d1&source=pwa");
  });
});
