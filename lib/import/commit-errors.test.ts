import { describe, expect, it } from "vitest";
import { commitFailureFor } from "./commit-errors";

describe("commitFailureFor", () => {
  it.each([
    [
      "collection_name_taken",
      'You already have a collection named "Dutch". Pick another name, or add to it.',
    ],
    ["destination_not_found", "That collection isn't available any more. Choose another."],
    [
      "import_too_large",
      "One import adds up to 500 terms, so split your list and add it in parts.",
    ],
    ["Not authenticated", "Log in to add terms."],
    [
      "duplicate key value violates unique constraint",
      "Couldn't add your terms. Nothing was added, and your list is still here. Try again.",
    ],
  ])("%s", (message, expected) => {
    expect(commitFailureFor({ message }, "Dutch").message).toBe(expected);
  });

  it("never shows database text", () => {
    expect(commitFailureFor({ message: 'relation "terms" does not exist' }).message).not.toMatch(
      /relation|terms"/,
    );
  });
});
