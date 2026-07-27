"use server";

import { redirect } from "next/navigation";
import { formatAuthError } from "@/lib/auth/format-auth-error";
import { getPasswordValidationError } from "@/lib/auth/password-policy";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = { error: string } | null;

export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!password || !confirmPassword) {
    return { error: "Both fields are required." };
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    return { error: passwordError };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your reset link has expired. Please request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: formatAuthError(error, "reset") };
  }

  redirect("/jargon");
}
