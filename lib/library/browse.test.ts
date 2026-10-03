import { describe, expect, it } from "vitest";
import { browseSearchOr, escapeIlike } from "./browse";

describe("escapeIlike", () => {
  it("escapes wildcard and backslash characters", () => {
    expect(escapeIlike("100%_done\\now")).toBe("100\\%\\_done\\\\now");
  });
});

describe("browseSearchOr", () => {
  it("returns null for blank queries", () => {
    expect(browseSearchOr("")).toBeNull();
    expect(browseSearchOr("   ")).toBeNull();
  });

  it("builds a quoted name-or-description ilike filter", () => {
    expect(browseSearchOr("machine")).toBe('name.ilike."%machine%",description.ilike."%machine%"');
  });

  it("escapes wildcards inside the quoted pattern", () => {
    expect(browseSearchOr("100%")).toBe('name.ilike."%100\\%%",description.ilike."%100\\%%"');
  });
});
