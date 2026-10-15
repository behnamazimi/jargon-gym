import { normalizeReferralCode } from "@/lib/auth/referral-code";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";

type GoogleSignInInput = { next: string; ref: string; email: string };

type GoogleOAuthResult = { url: string } | { error: "suspended" | "oauth-failed" };

export function readGoogleSignInInput(formData: FormData): GoogleSignInInput {
  return {
    next: safeNextPath(formData.get("next")?.toString() ?? null, "/complete-signup"),
    ref: normalizeReferralCode(formData.get("ref")?.toString()),
    email: formData.get("email")?.toString().trim() ?? "",
  };
}

/** Starts Google sign-in and returns the Google URL; `callbackUrl` is where Supabase sends the user back. */
export async function requestGoogleOAuthUrl(
  { next, ref, email }: GoogleSignInInput,
  callbackUrl: string,
): Promise<GoogleOAuthResult> {
  const params = new URLSearchParams({ next });
  if (ref) {
    params.set("ref", ref);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${callbackUrl}?${params.toString()}`,
      skipBrowserRedirect: true,
      queryParams: email ? { login_hint: email } : undefined,
    },
  });

  if (error || !data.url) {
    return { error: error?.code === "user_banned" ? "suspended" : "oauth-failed" };
  }
  return { url: data.url };
}
