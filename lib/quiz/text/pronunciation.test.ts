import { describe, expect, it } from "vitest";
import { withoutPronunciation } from "./pronunciation";

describe("withoutPronunciation", () => {
  it("drops a pronunciation at the end", () => {
    expect(withoutPronunciation("blood. /ət ˈblut/")).toBe("blood.");
    expect(withoutPronunciation("to fit; to pass (in a game). /ˈpɑsə(n)/ ")).toBe(
      "to fit; to pass (in a game).",
    );
  });

  it("keeps slashes that are part of the text", () => {
    expect(withoutPronunciation("by bike / bus / car")).toBe("by bike / bus / car");
    expect(withoutPronunciation("sized as XS/S/M/L/XL instead of points")).toBe(
      "sized as XS/S/M/L/XL instead of points",
    );
    expect(withoutPronunciation("to want ik wil · jij wil/wilt")).toBe(
      "to want ik wil · jij wil/wilt",
    );
  });
});
