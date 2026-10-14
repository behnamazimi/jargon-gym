import { describe, expect, it } from "vitest";
import { isIosDevice } from "./platform";

describe("isIosDevice", () => {
  it("detects iPhone", () => {
    expect(
      isIosDevice({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        platform: "iPhone",
        maxTouchPoints: 5,
        hasMSStream: false,
      }),
    ).toBe(true);
  });

  it("detects iPadOS desktop-UA iPads", () => {
    expect(
      isIosDevice({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        platform: "MacIntel",
        maxTouchPoints: 5,
        hasMSStream: false,
      }),
    ).toBe(true);
  });

  it("rejects desktop Mac", () => {
    expect(
      isIosDevice({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        platform: "MacIntel",
        maxTouchPoints: 0,
        hasMSStream: false,
      }),
    ).toBe(false);
  });
});
