import { describe, expect, it } from "vitest";
import { readLandingRedirect } from "./landing";

function redirectFor(query: string, cookie: string | undefined, pathname = "/app/read") {
  return readLandingRedirect(pathname, new URLSearchParams(query), cookie);
}

describe("readLandingRedirect", () => {
  it("goes to Stories when it's the default", () => {
    expect(redirectFor("", "stories")).toBe("/app/read/stories");
  });

  it("stays on Cards when Stories isn't the default or isn't known yet", () => {
    expect(redirectFor("", "cards")).toBeNull();
    expect(redirectFor("", undefined)).toBeNull();
  });

  it("only applies to Read itself", () => {
    expect(redirectFor("", "stories", "/app/read/stories")).toBeNull();
  });

  it("never leaves an explicit Cards visit or a single-term link", () => {
    for (const query of ["view=cards", "termId=t1", "termId=t1&alreadyRead=true"]) {
      expect(redirectFor(query, "stories")).toBeNull();
    }
  });

  it("carries the collection and other params, but not Cards-only ones", () => {
    expect(redirectFor("collection=d1&source=pwa&alreadyRead=true", "stories")).toBe(
      "/app/read/stories?collection=d1&source=pwa",
    );
  });
});
