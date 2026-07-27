"use server";

import { redirect } from "next/navigation";
import { getAppOrigin } from "@/lib/auth/app-origin";
import { normalizeReferralCode } from "@/lib/auth/referral-code";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next")?.toString() ?? null, "/complete-signup");
  const ref = normalizeReferralCode(formData.get("ref")?.toString());
  const origin = await getAppOrigin();
  const supabase = await createClient();

  const params = new URLSearchParams({ next });
  if (ref) {
    params.set("ref", ref);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?${params.toString()}`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth-failed");
  }

  redirect(data.url);
}
