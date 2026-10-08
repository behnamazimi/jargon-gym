"use server";

import { trackServer } from "@/lib/analytics/server";
import { redirect } from "next/navigation";
import { getAppOrigin } from "@/lib/auth/app-origin";
import { EMAIL_FLOW } from "@/lib/auth/callback-flow";
import {
  formatAuthError,
  formatSignupError,
  RATE_LIMITED_ERROR,
} from "@/lib/auth/format-auth-error";
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

/** Where the confirmation link sends the person once their email is confirmed. */
async function confirmationRedirect(next: string): Promise<string> {
  const origin = await getAppOrigin();
  const params = new URLSearchParams({ flow: EMAIL_FLOW, next });
  return `${origin}/auth/callback?${params.toString()}`;
}

const RESEND_FAILED = "Couldn't resend the email. Try again.";

/** Sends the confirmation email again. Says nothing about whether the address has an account. */
export async function resendConfirmation(
  email: string,
  rawNext?: string,
): Promise<{ error?: string }> {
  const address = email.trim();
  if (!address) return { error: RESEND_FAILED };

  const next = safeNextPath(rawNext ?? null);
  const [emailRedirectTo, supabase] = await Promise.all([
    confirmationRedirect(next),
    createClient(),
  ]);
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: address,
    options: { emailRedirectTo },
  });

  if (!error) return {};
  return {
    error: formatAuthError(error) === RATE_LIMITED_ERROR ? RATE_LIMITED_ERROR : RESEND_FAILED,
  };
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

  const next = safeNextPath(formData.get("next")?.toString() ?? null);
  const [emailRedirectTo, supabase] = await Promise.all([
    confirmationRedirect(next),
    createClient(),
  ]);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        referral_code: referenceCode,
      },
    },
  });

  if (error) {
    return { error: formatSignupError(error) };
  }

  if (data.user) {
    trackServer(data.user.id, "user_signed_up", {
      method: "email",
      needs_email_confirmation: !data.session,
    });
  }

  // No session yet means the project wants the email confirmed first.
  if (!data.session) {
    return { checkEmail: email };
  }

  redirect(next);
}
