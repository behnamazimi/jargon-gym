import { describe, expect, it } from "vitest";
import { pickSetting } from "./settings";

describe("pickSetting", () => {
  it("draws only work scenes for work formats", () => {
    expect(pickSetting("incident-postmortem", () => 0)).toBe("the first day at a new job");
    for (let step = 0; step < 1; step += 0.05) {
      expect(pickSetting("slack-thread", () => step)).not.toBe("a lost cat in the neighbourhood");
    }
  });
});
