import { describe, expect, it } from "vitest";
import { AdminError } from "./admin-error";
import { throwRpcError } from "./rpc-error";

describe("throwRpcError", () => {
  it("shows the message of a readable database error", () => {
    expect(() =>
      throwRpcError({ code: "AD001", message: "That account no longer exists." }),
    ).toThrow(new AdminError("That account no longer exists."));
  });

  it("rethrows any other error untouched, so its message stays hidden", () => {
    const error = { code: "42P01", message: "relation admin_secrets does not exist" };
    try {
      throwRpcError(error);
    } catch (thrown) {
      expect(thrown).toBe(error);
      expect(thrown).not.toBeInstanceOf(AdminError);
    }
    expect.assertions(2);
  });
});
