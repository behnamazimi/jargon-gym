import { describe, expect, it } from "vitest";
import { voteFeedback } from "./feedback";

describe("voteFeedback", () => {
  it("explains each vote", () => {
    expect(voteFeedback(1)).toMatch(/more stories/);
    expect(voteFeedback(-1)).toMatch(/fewer stories/);
    expect(voteFeedback(null)).toBe("Vote removed.");
  });
});
