"use server";

import { trackServer } from "@/lib/analytics/server";
import { redirect } from "next/navigation";
import { formatSignupError } from "@/lib/auth/format-auth-error";
import { normalizeReferralCode } from "@/lib/auth/referral-code";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { getSessionUser } from "@/lib/auth/require-session";
import { createClient } from "@/lib/supabase/server";

export type CompleteSignupState = { error: string } | null;

export async function redeemReferralCode(
  _prev: CompleteSignupState,
  formData: FormData,
): Promise<CompleteSignupState> {
  const referenceCode = normalizeReferralCode(formData.get("referenceCode")?.toString());

  if (!referenceCode) {
    return { error: "Enter your invite code." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_referral_code", {
    p_code: referenceCode,
  });

  if (error) {
    return { error: formatSignupError(error) };
  }

  const { user } = await getSessionUser();
  if (user)
    trackServer(user.id, "user_signed_up", { method: "google", needs_email_confirmation: false });

  const next = safeNextPath(formData.get("next")?.toString() ?? null);
  redirect(next);
}
