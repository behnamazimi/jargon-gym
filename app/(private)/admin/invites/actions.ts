"use server";

import { revalidatePath } from "next/cache";
import { getAppOrigin } from "@/lib/auth/app-origin";
import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";
import { sendInviteEmail } from "@/lib/email/resend";

async function requireAdminClient() {
  const { supabase, user } = await getSessionUser();
  if (!user || !(await getUserIsAdmin(user.id))) {
    throw new Error("Admins only.");
  }
  return { supabase, user };
}

export async function approveWaitlistRequest(requestId: string): Promise<void> {
  const { supabase, user } = await requireAdminClient();

  const { data: request, error: fetchError } = await supabase
    .from("waitlist_requests")
    .select("id, email, status")
    .eq("id", requestId)
    .single();
  if (fetchError) throw fetchError;
  if (request.status !== "pending") {
    throw new Error("Request already handled.");
  }

  const { data: referralCode, error: rpcError } = await supabase.rpc("create_referral_code");
  if (rpcError) throw rpcError;
  if (!referralCode) throw new Error("Failed to create a referral code.");

  const origin = await getAppOrigin();
  const signupUrl = `${origin}/signup?ref=${referralCode.code}`;

  await sendInviteEmail({ to: request.email, signupUrl });

  const { error: updateError } = await supabase
    .from("waitlist_requests")
    .update({
      status: "invited",
      referral_code_id: referralCode.id,
      invited_by: user.id,
      invited_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (updateError) throw updateError;

  revalidatePath("/admin/invites");
}
