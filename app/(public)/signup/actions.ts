"use server";

import { redirect } from "next/navigation";
import { formatSignupError } from "@/lib/auth/format-auth-error";
import { normalizeReferralCode } from "@/lib/auth/referral-code";
import { getPasswordValidationError } from "@/lib/auth/password-policy";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";

/** `checkEmail` is the address a confirmation link was sent to. */
export type SignupState = { error?: string; checkEmail?: string } | null;

type SignupFields = { email: string; password: string; referenceCode: string };

function parseSignupFields(formData: FormData): SignupFields | null {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const referenceCode = normalizeReferralCode(formData.get("referenceCode")?.toString());

  if (!email || !password || !referenceCode) {
    return null;
  }

  return { email, password, referenceCode };
}

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const fields = parseSignupFields(formData);
  if (!fields) {
    return { error: "Fill in every field to continue." };
  }
  const { email, password, referenceCode } = fields;

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
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

  // No session yet means the project wants the email confirmed first.
  if (!data.session) {
    return { checkEmail: email };
  }

  const next = safeNextPath(formData.get("next")?.toString() ?? null);
  redirect(next);
}
