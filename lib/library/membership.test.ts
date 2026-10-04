import { describe, expect, it } from "vitest";
import { getCollectionMembership } from "./membership";

function client({ ownerId, added }: { ownerId: string | null; added: number }) {
  const calls: string[] = [];
  const query = (table: string) => {
    calls.push(table);
    const node: Record<string, unknown> = {};
    const settle = () => Object.assign(Promise.resolve({ count: added, error: null }), node);
    node.select = () => node;
    node.eq = settle;
    node.maybeSingle = async () => ({
      data: ownerId === null ? null : { owner_id: ownerId },
      error: null,
    });
    return node;
  };
  return { client: { from: query } as never, calls };
}

describe("getCollectionMembership", () => {
  it("says owned without looking at the library", async () => {
    const fake = client({ ownerId: "me", added: 0 });
    expect(await getCollectionMembership(fake.client, "me", "d1")).toBe("owned");
    expect(fake.calls).toEqual(["domains"]);
  });

  it("says added when it is in the library", async () => {
    const fake = client({ ownerId: "someone", added: 1 });
    expect(await getCollectionMembership(fake.client, "me", "d1")).toBe("added");
  });

  it("says available otherwise", async () => {
    expect(
      await getCollectionMembership(client({ ownerId: "someone", added: 0 }).client, "me", "d1"),
    ).toBe("available");
    expect(
      await getCollectionMembership(client({ ownerId: null, added: 0 }).client, "me", "d1"),
    ).toBe("available");
  });
});
