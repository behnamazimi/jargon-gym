import { describe, expect, it } from "vitest";
import { fetchTermIndexByCollection } from "./terms";

/** A query builder whose range() caps each page at 1000 rows, like PostgREST. */
function fakeClient(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({
    id: `t${i}`,
    term: `Term ${i}`,
    category: null,
    definition: "x",
  }));
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    range: (from: number, to: number) =>
      Promise.resolve({ data: rows.slice(from, Math.min(to + 1, from + 1000)), error: null }),
  };
  return { from: () => query };
}

describe("fetchTermIndexByCollection", () => {
  it("reads a collection larger than one page", async () => {
    const rows = await fetchTermIndexByCollection(fakeClient(2345) as never, "d1");
    expect(rows).toHaveLength(2345);
    expect(rows.at(-1)?.id).toBe("t2344");
  });
});
