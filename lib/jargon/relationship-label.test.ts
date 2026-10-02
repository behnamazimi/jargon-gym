import { describe, expect, it } from "vitest";
import { relationshipLabel } from "./relationship-label";

describe("relationshipLabel", () => {
  it("turns snake_case into words", () => {
    expect(relationshipLabel("leads_to")).toBe("leads to");
    expect(relationshipLabel("is_a_kind_of")).toBe("is a kind of");
  });

  it("leaves plain text alone", () => {
    expect(relationshipLabel("contrasts with")).toBe("contrasts with");
  });
});
