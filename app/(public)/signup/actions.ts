"use server";

import { redirect } from "next/navigation";
import { formatSignupError } from "@/lib/auth/format-auth-error";
import { normalizeReferralCode } from "@/lib/auth/referral-code";
import { getPasswordValidationError } from "@/lib/auth/password-policy";
import { createClient } from "@/lib/supabase/server";

export type SignupState = { error: string } | null;

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const referenceCode = normalizeReferralCode(formData.get("referenceCode")?.toString());

  if (!email || !password || !referenceCode) {
    return { error: "All fields are required." };
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

  redirect("/jargon");
}
