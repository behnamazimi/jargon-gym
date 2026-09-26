import { describe, expect, it } from "vitest";
import { pickSetting } from "./settings";

describe("pickSetting", () => {
  it("draws across the whole list", () => {
    expect(pickSetting(() => 0)).toBe("a busy morning at a bakery");
    expect(pickSetting(() => 0.9999)).toBe("a family moving to another country");
  });
});
