import { describe, expect, it } from "vitest";
import { creditSettingsSchema, grantCreditsSchema } from "./settings-schema";

const valid = {
  defaultAllowance: 100,
  monthlyRefill: 30,
  quizCreditsPerQuestion: 1,
  storyCreditsPerTerm: 1,
};

describe("creditSettingsSchema", () => {
  it("accepts the defaults", () => {
    expect(creditSettingsSchema.safeParse(valid).success).toBe(true);
  });

  it("allows a zero allowance or refill but not a free action", () => {
    expect(
      creditSettingsSchema.safeParse({ ...valid, defaultAllowance: 0, monthlyRefill: 0 }).success,
    ).toBe(true);
    expect(creditSettingsSchema.safeParse({ ...valid, quizCreditsPerQuestion: 0 }).success).toBe(
      false,
    );
    expect(creditSettingsSchema.safeParse({ ...valid, storyCreditsPerTerm: 0 }).success).toBe(
      false,
    );
  });

  it("rejects negatives, decimals, NaN and values past the database bounds", () => {
    for (const bad of [-1, 2.5, Number.NaN, 1_000_001]) {
      expect(creditSettingsSchema.safeParse({ ...valid, defaultAllowance: bad }).success).toBe(
        false,
      );
    }
    expect(creditSettingsSchema.safeParse({ ...valid, quizCreditsPerQuestion: 1001 }).success).toBe(
      false,
    );
  });
});

describe("grantCreditsSchema", () => {
  it("accepts a normal grant and trims the text", () => {
    const parsed = grantCreditsSchema.parse({
      email: " a@example.com ",
      amount: 25,
      note: " why ",
    });
    expect(parsed).toEqual({ email: "a@example.com", amount: 25, note: "why" });
  });

  it("explains what is wrong", () => {
    const issue = (input: object) => {
      const result = grantCreditsSchema.safeParse(input);
      return result.success ? null : result.error.issues[0]?.message;
    };
    expect(issue({ email: "  ", amount: 5 })).toBe("Enter an email.");
    expect(issue({ email: "a@example.com", amount: 0 })).toBe("Enter at least 1 credit.");
    expect(issue({ email: "a@example.com", amount: 10_001 })).toBe("Grant at most 10,000.");
  });
});
