import { describe, expect, it } from "vitest";
import { pickSetting } from "./settings";

describe("pickSetting", () => {
  it("draws from everyday and work scenes for open formats", () => {
    expect(pickSetting("short-story", () => 0)).toBe("a busy morning at a bakery");
    expect(pickSetting("short-story", () => 0.9999)).toBe("a budget cut that forces hard choices");
  });

  it("draws only work scenes for work formats", () => {
    expect(pickSetting("incident-postmortem", () => 0)).toBe("the first day at a new job");
    for (let step = 0; step < 1; step += 0.05) {
      expect(pickSetting("slack-thread", () => step)).not.toBe("a lost cat in the neighbourhood");
    }
  });
});
