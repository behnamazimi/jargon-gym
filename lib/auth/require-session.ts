import { cookies, headers } from "next/headers";
import { cache } from "react";
import { VERIFIED_USER_HEADER } from "@/lib/auth/verified-user-header";
import { createClient } from "@/lib/supabase/server";

export const getSessionUser = cache(async function getSessionUser() {
  const supabase = await createClient();

  // proxy.ts already verified this request's session via a network call to
  // supabase.auth.getUser() moments ago. When it forwarded the verified user
  // id, getSession() (a local cookie decode, no network round trip) is
  // enough to fetch the same user — we just confirm it matches what the
  // proxy verified before trusting it.
  const verifiedUserId = (await headers()).get(VERIFIED_USER_HEADER);
  if (verifiedUserId) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user.id === verifiedUserId) {
      return { supabase, user: session.user, error: null };
    }
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user, error };
});

export const getUserIsAdmin = cache(async function getUserIsAdmin(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return profile?.role === "admin";
});

/**
 * Cheap, unverified signal for layout chrome branch selection only — checks
 * for the presence of a Supabase auth cookie without validating it. Never
 * use this for authorization; getSessionUser()/requireAuthenticatedClient()
 * remain the source of truth for whether a user is actually logged in.
 */
export async function hasLikelySession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.getAll().some((c) => c.name.includes("-auth-token"));
}

export async function requireAuthenticatedClient() {
  const { supabase, user, error } = await getSessionUser();

  if (error || !user) {
    return { error: "Log in to continue." as const };
  }

  return { supabase, user };
}

/**
 * For admin-only server actions. Throws (rather than returning an error
 * value) so call sites can just `await` it and let the throw propagate to
 * the client's try/catch — matching how every admin action in this app
 * already surfaces "Admins only." to the UI.
 */
export async function requireAdminClient() {
  const { supabase, user } = await getSessionUser();
  if (!user || !(await getUserIsAdmin(user.id))) {
    throw new Error("Admins only.");
  }
  return { supabase, user };
}
