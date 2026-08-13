"use server";

import { redirect } from "next/navigation";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { getPasswordValidationError } from "@/lib/auth/password-policy";
import { getSessionUser } from "@/lib/auth/require-session";

export type ResetPasswordState = { error: string } | null;

export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!password || !confirmPassword) {
    return { error: "Enter a new password in both fields." };
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    return { error: passwordError };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const { supabase, user } = await getSessionUser();

  if (!user) {
    return { error: "That reset link expired. Request a new one from the login page." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: formatAuthError(error, "reset") };
  }

  redirect("/jargon");
}
