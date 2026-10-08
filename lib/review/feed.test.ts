import { describe, expect, it } from "vitest";
import { parseReviewFeedRequest } from "./feed";

const ID = "11111111-1111-1111-1111-111111111111";

describe("parseReviewFeedRequest", () => {
  it("accepts all collections or one collection id, with uuid excludes", () => {
    expect(parseReviewFeedRequest({ collectionId: "all", excludeTermIds: [] })).toEqual({
      collectionId: "all",
      excludeTermIds: [],
    });
    expect(parseReviewFeedRequest({ collectionId: ID, excludeTermIds: [ID] })).toEqual({
      collectionId: ID,
      excludeTermIds: [ID],
    });
  });

  it("rejects malformed bodies", () => {
    expect(parseReviewFeedRequest(null)).toBeNull();
    expect(parseReviewFeedRequest({ collectionId: "nope", excludeTermIds: [] })).toBeNull();
    expect(parseReviewFeedRequest({ collectionId: "", excludeTermIds: [] })).toBeNull();
    expect(parseReviewFeedRequest({ collectionId: "all" })).toBeNull();
    expect(parseReviewFeedRequest({ collectionId: "all", excludeTermIds: ["x"] })).toBeNull();
    expect(parseReviewFeedRequest({ collectionId: "all", excludeTermIds: [1] })).toBeNull();
    expect(
      parseReviewFeedRequest({ collectionId: "all", excludeTermIds: Array(20_001).fill(ID) }),
    ).toBeNull();
  });
});
