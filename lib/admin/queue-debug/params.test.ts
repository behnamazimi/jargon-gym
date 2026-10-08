import { describe, expect, it } from "vitest";
import { parseQueueParams, queueHref } from "./params";

const ID = "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f";

describe("parseQueueParams", () => {
  it("defaults everything", () => {
    expect(parseQueueParams({})).toEqual({
      q: "",
      userId: null,
      collectionId: null,
      tab: "read",
      limit: 50,
      page: 1,
    });
  });

  it("keeps valid values", () => {
    expect(
      parseQueueParams({
        user: ID,
        collection: ID,
        tab: "cooldown",
        limit: "250",
        q: " ann ",
        page: "3",
      }),
    ).toEqual({ q: "ann", userId: ID, collectionId: ID, tab: "cooldown", limit: 250, page: 3 });
  });

  it("drops what it doesn't recognise", () => {
    expect(parseQueueParams({ user: "x", collection: "all", tab: "nope", limit: "7" })).toEqual({
      q: "",
      userId: null,
      collectionId: null,
      tab: "read",
      limit: 50,
      page: 1,
    });
  });
});

describe("queueHref", () => {
  it("keeps only what is set", () => {
    expect(queueHref({})).toBe("/admin/system/queue");
    expect(queueHref({ userId: ID, tab: "quiz", limit: 100 })).toBe(
      `/admin/system/queue?user=${ID}&tab=quiz&limit=100`,
    );
    expect(queueHref({ userId: ID, tab: "read", limit: 50 })).toBe(
      `/admin/system/queue?user=${ID}`,
    );
  });
});
