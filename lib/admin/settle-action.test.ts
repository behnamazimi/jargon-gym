import { describe, expect, it, vi } from "vitest";
import { settleAdminAction } from "./settle-action";

vi.spyOn(console, "error").mockImplementation(() => undefined);

describe("settleAdminAction", () => {
  it("passes a result through", async () => {
    expect(await settleAdminAction(async () => ({ ok: true as const, data: 1 }))).toEqual({
      ok: true,
      data: 1,
    });
    expect(await settleAdminAction(async () => ({ ok: false as const, error: "No." }))).toEqual({
      ok: false,
      error: "No.",
    });
  });

  it("turns a rejected call into a result", async () => {
    const result = await settleAdminAction<void>(async () => {
      throw new Error("Failed to fetch");
    });
    expect(result).toEqual({
      ok: false,
      error: "Couldn't reach the server. Reload the page and try again.",
    });
  });
});
