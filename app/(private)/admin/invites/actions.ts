"use server";

import { revalidatePath } from "next/cache";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";
import { exactEmailPattern } from "@/lib/admin/email-lookup";
import { getAppOrigin } from "@/lib/auth/app-origin";
import { sendInviteEmail } from "@/lib/email/resend";
import type { requireAdminClient } from "@/lib/auth/require-session";

type AdminClient = Awaited<ReturnType<typeof requireAdminClient>>["supabase"];

/** Existing accounts finish signing up in place; everyone else gets the full signup form. */
async function buildSignupUrl(supabase: AdminClient, email: string, code: string) {
  const { data: existingAccount, error } = await supabase
    .from("users")
    .select("id")
    .ilike("email", exactEmailPattern(email))
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  const origin = await getAppOrigin();
  return existingAccount
    ? `${origin}/complete-signup?ref=${code}`
    : `${origin}/signup?ref=${code}&email=${encodeURIComponent(email)}`;
}

/** Marks the request invited before the email goes out, so a second click can't
 *  send a second email. If the email fails the request stays invited, because
 *  the failure may have happened after delivery; the admin uses Resend. */
export async function approveWaitlistRequest(requestId: string) {
  return runAdminAction(async ({ supabase, user }): Promise<{ emailSent: boolean }> => {
    const { data: request, error: fetchError } = await supabase
      .from("waitlist_requests")
      .select("id, email, status")
      .eq("id", requestId)
      .single();
    if (fetchError) throw fetchError;
    if (request.status !== "pending") throw new AdminError("Request already handled.");

    const { data: referralCode, error: rpcError } = await supabase.rpc("create_referral_code");
    if (rpcError) throw rpcError;
    if (!referralCode) throw new Error("Failed to create a referral code.");

    const { data: claimed, error: claimError } = await supabase
      .from("waitlist_requests")
      .update({
        status: "invited",
        referral_code_id: referralCode.id,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("id");
    if (claimError || !claimed?.length) {
      await deactivateCode(supabase, referralCode.id);
      if (claimError) throw claimError;
      throw new AdminError("Request already handled.");
    }

    revalidatePath("/admin/invites");
    try {
      const signupUrl = await buildSignupUrl(supabase, request.email, referralCode.code);
      await sendInviteEmail({ to: request.email, signupUrl });
    } catch (err) {
      console.error("Invite email failed:", err);
      return { emailSent: false };
    }
    return { emailSent: true };
  });
}

/** A code minted for a request that lost the race must not stay usable. */
async function deactivateCode(supabase: AdminClient, codeId: string) {
  const { error } = await supabase
    .from("referral_codes")
    .update({ is_active: false })
    .eq("id", codeId);
  if (error) console.error("Couldn't deactivate an unused referral code:", error);
}

/** Sends the same invite again, with the same code, while the code is still unused. */
export async function resendInvite(requestId: string) {
  return runAdminAction(async ({ supabase }) => {
    const { data: request, error } = await supabase
      .from("waitlist_requests")
      .select("email, status, referral_codes(code, used_by, is_active)")
      .eq("id", requestId)
      .single();
    if (error) throw error;

    const code = request.referral_codes;
    if (request.status !== "invited" || !code) {
      throw new AdminError("Only invited requests can be resent.");
    }
    if (code.used_by) throw new AdminError("They already signed up.");
    if (!code.is_active) throw new AdminError("That invite code is no longer active.");

    const signupUrl = await buildSignupUrl(supabase, request.email, code.code);
    try {
      await sendInviteEmail({ to: request.email, signupUrl });
    } catch (err) {
      console.error("Invite resend failed:", err);
      throw new AdminError("Couldn't send the email. Try again.");
    }
  });
}
