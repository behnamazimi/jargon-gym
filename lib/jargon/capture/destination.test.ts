import { describe, expect, it } from "vitest";
import { pickDestination } from "./destination";

const collections = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("pickDestination", () => {
  it.each([
    ["preset wins", "b", "c", "b"],
    ["stored when no preset", null, "c", "c"],
    ["invalid preset falls to stored", "x", "c", "c"],
    ["deleted stored falls to first", null, "x", "a"],
    ["nothing set uses first", undefined, undefined, "a"],
  ])("%s", (_name, preset, stored, expected) => {
    expect(pickDestination({ preset, stored, collections })).toBe(expected);
  });

  it("is null without collections", () => {
    expect(pickDestination({ preset: "a", stored: "a", collections: [] })).toBeNull();
  });
});
