"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REFERRAL_VERIFIED_COOKIE } from "@/lib/supabase/proxy";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Otherwise a different account signing in on this device would inherit
  // the previous user's cached referral-verified status.
  (await cookies()).delete(REFERRAL_VERIFIED_COOKIE);
  redirect("/");
}
