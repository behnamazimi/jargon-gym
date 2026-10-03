import { describe, expect, it } from "vitest";
import { escapeLike } from "./like-escape";

describe("escapeLike", () => {
  it.each([
    ["plain text", "plain text"],
    ["", ""],
    ["a_b", "a\\_b"],
    ["100%", "100\\%"],
    ["back\\slash", "back\\\\slash"],
    ["50%_off\\", "50\\%\\_off\\\\"],
  ])("escapes %j", (input, expected) => {
    expect(escapeLike(input)).toBe(expected);
  });
});
