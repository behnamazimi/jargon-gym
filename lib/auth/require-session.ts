import { cookies, headers } from "next/headers";
import { cache } from "react";
import { AdminError } from "@/lib/admin/admin-error";
import { isBanned } from "@/lib/auth/suspension";
import { readVerifiedUser, type VerifiedUser } from "@/lib/auth/verified-user-header";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = VerifiedUser;

/** The signed-in user. The proxy has already verified the session on every
 *  request it matches (a ban shows once its token refreshes), and forwards the result
 *  in headers, so this only asks Supabase Auth itself when those are absent. */
export const getSessionUser = cache(async function getSessionUser(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: SessionUser | null;
  error: Error | null;
}> {
  const [supabase, requestHeaders] = await Promise.all([createClient(), headers()]);
  const verified = await readVerifiedUser(requestHeaders);
  if (verified) return { supabase, user: verified, error: null };

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user: user && !isBanned(user) ? { id: user.id, email: user.email ?? null } : null,
    error,
  };
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
 * For admin-only server actions. Throws an `AdminError` for non-admins; admin
 * actions call it through `runAdminAction`, which turns the throw into a result.
 */
export async function requireAdminClient() {
  const { supabase, user } = await getSessionUser();
  if (!user || !(await getUserIsAdmin(user.id))) {
    throw new AdminError("Admins only.");
  }
  return { supabase, user };
}
