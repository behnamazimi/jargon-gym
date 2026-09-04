import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getSessionUser = cache(async function getSessionUser() {
  const supabase = await createClient();
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
