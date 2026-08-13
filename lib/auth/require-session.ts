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
