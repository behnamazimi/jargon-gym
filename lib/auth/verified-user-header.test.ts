import { describe, expect, it } from "vitest";
import { signedUserHeaders } from "./signed-user-headers";
import { readVerifiedUser } from "./verified-user-header";

describe("verified user headers", () => {
  it("reads back what the proxy signed, including a non-ASCII email", async () => {
    const headers = new Headers(await signedUserHeaders("user-1", "ünï@example.com"));
    expect(await readVerifiedUser(headers)).toEqual({ id: "user-1", email: "ünï@example.com" });
  });

  it("rejects unsigned or altered headers", async () => {
    expect(await readVerifiedUser(new Headers({ "x-verified-user-id": "user-1" }))).toBeNull();

    const signed = await signedUserHeaders("user-1");
    const swapped = new Headers({ ...signed, "x-verified-user-id": "user-2" });
    expect(await readVerifiedUser(swapped)).toBeNull();

    const badSignature = new Headers({ ...signed, "x-verified-user-sig": "zz" });
    expect(await readVerifiedUser(badSignature)).toBeNull();
  });
});
