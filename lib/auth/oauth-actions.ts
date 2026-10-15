"use server";

import { redirect } from "next/navigation";
import { getAppOrigin } from "@/lib/auth/app-origin";
import { readGoogleSignInInput, requestGoogleOAuthUrl } from "@/lib/auth/google-oauth";

export async function signInWithGoogle(formData: FormData) {
  const origin = await getAppOrigin();
  const result = await requestGoogleOAuthUrl(
    readGoogleSignInInput(formData),
    `${origin}/auth/callback`,
  );

  if ("error" in result) {
    redirect(result.error === "suspended" ? "/login?error=suspended" : "/login?error=oauth-failed");
  }
  redirect(result.url);
}
