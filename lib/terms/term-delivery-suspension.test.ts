import { describe, expect, it } from "vitest";
import { resolveUserIdByChatId } from "./term-delivery";

function fakeClient(row: unknown) {
  const node = {
    select: () => node,
    eq: () => node,
    maybeSingle: async () => ({ data: row, error: null }),
  };
  return { from: () => node } as never;
}

describe("resolveUserIdByChatId", () => {
  it("finds the person linked to a chat", async () => {
    const client = fakeClient({ user_id: "u1", users: { suspended_at: null } });
    expect(await resolveUserIdByChatId(client, 1)).toBe("u1");
  });

  it("treats a chat that isn't linked as nobody", async () => {
    expect(await resolveUserIdByChatId(fakeClient(null), 1)).toBeNull();
  });

  it("treats a suspended person's chat as nobody, so every command asks them to connect", async () => {
    const client = fakeClient({ user_id: "u1", users: { suspended_at: "2026-09-30T00:00:00Z" } });
    expect(await resolveUserIdByChatId(client, 1)).toBeNull();
  });
});
