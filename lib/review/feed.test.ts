import { describe, expect, it } from "vitest";
import { parseReviewFeedRequest } from "./feed";

const ID = "11111111-1111-1111-1111-111111111111";

describe("parseReviewFeedRequest", () => {
  it("accepts all collections or one collection id, with uuid excludes", () => {
    expect(parseReviewFeedRequest({ domainId: "all", excludeTermIds: [] })).toEqual({
      domainId: "all",
      excludeTermIds: [],
    });
    expect(parseReviewFeedRequest({ domainId: ID, excludeTermIds: [ID] })).toEqual({
      domainId: ID,
      excludeTermIds: [ID],
    });
  });

  it("rejects malformed bodies", () => {
    expect(parseReviewFeedRequest(null)).toBeNull();
    expect(parseReviewFeedRequest({ domainId: "nope", excludeTermIds: [] })).toBeNull();
    expect(parseReviewFeedRequest({ domainId: "", excludeTermIds: [] })).toBeNull();
    expect(parseReviewFeedRequest({ domainId: "all" })).toBeNull();
    expect(parseReviewFeedRequest({ domainId: "all", excludeTermIds: ["x"] })).toBeNull();
    expect(parseReviewFeedRequest({ domainId: "all", excludeTermIds: [1] })).toBeNull();
    expect(
      parseReviewFeedRequest({ domainId: "all", excludeTermIds: Array(20_001).fill(ID) }),
    ).toBeNull();
  });
});
