import { describe, expect, it } from "vitest";
import { isIosDevice, PLATFORM_MD_MIN_PX, PLATFORM_MEDIA } from "./platform";

describe("PLATFORM_MEDIA", () => {
  it("phone query matches Tailwind max-md (below 768px)", () => {
    expect(PLATFORM_MD_MIN_PX).toBe(768);
    expect(PLATFORM_MEDIA.phone).toBe("(max-width: 767px)");
  });

  it("keeps standalone, pointer, and motion query strings stable", () => {
    expect(PLATFORM_MEDIA.standalone).toBe("(display-mode: standalone)");
    expect(PLATFORM_MEDIA.coarsePointer).toBe("(pointer: coarse)");
    expect(PLATFORM_MEDIA.reducedMotion).toBe("(prefers-reduced-motion: reduce)");
  });
});

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
