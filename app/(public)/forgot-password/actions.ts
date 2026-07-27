"use server";

import { formatAuthError } from "@/lib/auth/format-auth-error";
import { getAppOrigin } from "@/lib/auth/app-origin";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { error: string } | { success: true } | null;

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = formData.get("email")?.toString().trim() ?? "";

  if (!email) {
    return { error: "Enter your email." };
  }

  const supabase = await createClient();
  const origin = await getAppOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: formatAuthError(error, "forgot") };
  }

  return { success: true };
}
