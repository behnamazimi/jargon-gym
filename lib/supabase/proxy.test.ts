import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VERIFIED_USER_EMAIL_HEADER, VERIFIED_USER_HEADER } from "@/lib/auth/verified-user-header";

const auth = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; banned_until: null },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: auth.user } }) },
  }),
}));

const { updateSession, REFERRAL_VERIFIED_COOKIE } = await import("./proxy");

/** The value Next will forward to the app for a request header. */
function forwarded(response: Response, name: string) {
  return response.headers.get(`x-middleware-request-${name}`);
}

function request(path: string, cookie = "") {
  return new NextRequest(`http://localhost${path}`, {
    headers: {
      [VERIFIED_USER_HEADER]: "forged-id",
      [VERIFIED_USER_EMAIL_HEADER]: "forged@example.com",
      cookie,
    },
  });
}

describe("updateSession", () => {
  beforeEach(() => {
    auth.user = null;
  });

  it("drops forged user headers on a public page for a signed-out visitor", async () => {
    const response = await updateSession(request("/"));
    expect(forwarded(response, VERIFIED_USER_HEADER)).toBeNull();
    expect(forwarded(response, VERIFIED_USER_EMAIL_HEADER)).toBeNull();
  });

  it("forwards the verified user instead of what the client sent", async () => {
    auth.user = { id: "real-id", email: "me@example.com", banned_until: null };
    const response = await updateSession(request("/jargon", `${REFERRAL_VERIFIED_COOKIE}=1`));
    expect(forwarded(response, VERIFIED_USER_HEADER)).toBe("real-id");
    expect(forwarded(response, VERIFIED_USER_EMAIL_HEADER)).toBe("me@example.com");
  });
});
