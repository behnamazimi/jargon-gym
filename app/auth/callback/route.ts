import { trackServer } from "@/lib/analytics/server";
import { NextResponse, type NextRequest } from "next/server";
import { callbackFailureError, callbackSignInMethod } from "@/lib/auth/callback-flow";
import { normalizeReferralCode } from "@/lib/auth/referral-code";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const ref = normalizeReferralCode(searchParams.get("ref"));
  const flow = searchParams.get("flow");

  if (searchParams.get("error_code") === "user_banned") {
    return NextResponse.redirect(`${origin}/login?error=suspended`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (ref) {
        const { error: redeemError } = await supabase.rpc("redeem_referral_code", {
          p_code: ref,
        });

        if (redeemError) {
          const params = new URLSearchParams({ ref, error: "invalid-code", next });
          return NextResponse.redirect(`${origin}/complete-signup?${params.toString()}`);
        }
      }

      trackServer(data.user.id, ref ? "user_signed_up" : "user_logged_in", {
        method: callbackSignInMethod(flow),
        ...(ref ? { needs_email_confirmation: false } : {}),
      });
      return NextResponse.redirect(`${origin}${next}`);
    }

    if (error.code === "user_banned") {
      return NextResponse.redirect(`${origin}/login?error=suspended`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=${callbackFailureError(flow)}`);
}
