import { describe, expect, it } from "vitest";
import { resolveUserFromToken } from "./tokens";

function fakeClient(options: { token: unknown; suspendedAt: string | null }) {
  const updates: unknown[] = [];
  const client = {
    from: (table: string) => {
      const node = {
        select: () => node,
        eq: () => node,
        update: (values: unknown) => {
          updates.push(values);
          return { eq: async () => ({ error: null }) };
        },
        maybeSingle: async () => ({
          data: table === "widget_tokens" ? options.token : { suspended_at: options.suspendedAt },
          error: null,
        }),
      };
      return node;
    },
  };
  return { client: client as never, updates };
}

describe("resolveUserFromToken", () => {
  it("returns the token's owner", async () => {
    const { client, updates } = fakeClient({
      token: { id: "t1", user_id: "u1" },
      suspendedAt: null,
    });
    expect(await resolveUserFromToken(client, "secret")).toBe("u1");
    expect(updates).toHaveLength(1);
  });

  it("returns nothing for an unknown token", async () => {
    const { client } = fakeClient({ token: null, suspendedAt: null });
    expect(await resolveUserFromToken(client, "secret")).toBeNull();
  });

  it("refuses a suspended person's token, and doesn't record a use", async () => {
    const { client, updates } = fakeClient({
      token: { id: "t1", user_id: "u1" },
      suspendedAt: "2026-09-30T00:00:00Z",
    });
    expect(await resolveUserFromToken(client, "secret")).toBeNull();
    expect(updates).toHaveLength(0);
  });
});
