"use server";

import { headers } from "next/headers";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { error: string } | { success: true } | null;

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = formData.get("email")?.toString().trim() ?? "";

  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: formatAuthError(error, "forgot") };
  }

  return { success: true };
}
