import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readVerifiedUser } from "@/lib/auth/verified-user-header";

process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-signing-secret";

const auth = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; banned_until: null },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: auth.user } }) },
  }),
}));

const { updateSession, REFERRAL_VERIFIED_COOKIE } = await import("./proxy");

/** The request headers Next will forward to the app. */
function forwardedHeaders(response: Response) {
  const forwarded = new Headers();
  const prefix = "x-middleware-request-";
  response.headers.forEach((value, name) => {
    if (name.startsWith(prefix)) forwarded.set(name.slice(prefix.length), value);
  });
  return forwarded;
}

function request(path: string, cookie = "") {
  return new NextRequest(`http://localhost${path}`, {
    headers: {
      "x-verified-user-id": "forged-id",
      "x-verified-user-email": "forged%40example.com",
      "x-verified-user-sig": "00",
      cookie,
    },
  });
}

describe("updateSession", () => {
  beforeEach(() => {
    auth.user = null;
  });

  it("drops forged user headers on a public page for a signed-out visitor", async () => {
    const forwarded = forwardedHeaders(await updateSession(request("/")));
    expect(forwarded.get("x-verified-user-id")).toBeNull();
    expect(forwarded.get("x-verified-user-sig")).toBeNull();
    expect(await readVerifiedUser(forwarded)).toBeNull();
  });

  it("forwards the verified user, signed, instead of what the client sent", async () => {
    auth.user = { id: "real-id", email: "mé@example.com", banned_until: null };
    const response = await updateSession(request("/app/library", `${REFERRAL_VERIFIED_COOKIE}=1`));
    expect(await readVerifiedUser(forwardedHeaders(response))).toEqual({
      id: "real-id",
      email: "mé@example.com",
    });
  });
});
