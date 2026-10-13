import { describe, expect, it } from "vitest";
import { sharePath } from "./share";

describe("sharePath", () => {
  it("sends a built-in public collection to its public page", () => {
    expect(sharePath({ id: "abc", publicSlug: "standup" })).toBe("/collections/standup");
  });

  it("sends any other collection to the shared-link landing", () => {
    expect(sharePath({ id: "abc", publicSlug: null })).toBe("/c/abc");
  });
});
