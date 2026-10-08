import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  linkedUserId: null as string | null,
  linkResult: { ok: true, userId: "u1" } as
    | { ok: true; userId: string }
    | { ok: false; reason: "invalid" | "already_linked" },
}));

vi.mock("@/lib/terms/term-delivery", () => ({
  resolveUserIdByChatId: async () => state.linkedUserId,
}));
vi.mock("./links", () => ({
  completeTelegramLink: async () => state.linkResult,
}));

const { handleStart } = await import("./commands");
const { ALREADY_CONNECTED_MESSAGE, CONNECT_MESSAGE, WELCOME_MESSAGE } = await import("./copy");

const client = {} as Parameters<typeof handleStart>[0];

function texts(actions: Awaited<ReturnType<typeof handleStart>>) {
  return actions.map((action) => (action.type === "sendMessage" ? action.text : ""));
}

describe("handleStart", () => {
  beforeEach(() => {
    state.linkedUserId = null;
    state.linkResult = { ok: true, userId: "u1" };
  });

  it("asks an unlinked chat to connect in Settings", async () => {
    expect(texts(await handleStart(client, 1, null))).toEqual([CONNECT_MESSAGE]);
  });

  it("greets an already-connected chat with the commands, not the connect prompt", async () => {
    state.linkedUserId = "u1";
    const [message] = texts(await handleStart(client, 1, null));
    expect(message).toBe(ALREADY_CONNECTED_MESSAGE);
    expect(message).toContain("/read");
  });

  it("welcomes a chat that links with a valid token", async () => {
    state.linkedUserId = "u1";
    expect(texts(await handleStart(client, 1, "token"))).toEqual([WELCOME_MESSAGE]);
  });

  it("reports an expired token", async () => {
    state.linkResult = { ok: false, reason: "invalid" };
    expect(texts(await handleStart(client, 1, "token"))[0]).toContain("invalid or expired");
  });
});
