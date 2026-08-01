"use server";

import { redirect } from "next/navigation";
import { formatSignupError } from "@/lib/auth/format-auth-error";
import { normalizeReferralCode } from "@/lib/auth/referral-code";
import { getPasswordValidationError } from "@/lib/auth/password-policy";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";

export type SignupState = { error: string } | null;

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const referenceCode = normalizeReferralCode(formData.get("referenceCode")?.toString());

  if (!email || !password || !referenceCode) {
    return { error: "Fill in every field to continue." };
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        referral_code: referenceCode,
      },
    },
  });

  if (error) {
    return { error: formatSignupError(error) };
  }

  const next = safeNextPath(formData.get("next")?.toString() ?? null);
  redirect(next);
}
