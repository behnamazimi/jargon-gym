import { NextResponse, type NextRequest } from "next/server";
import { normalizeReferralCode } from "@/lib/auth/referral-code";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const ref = normalizeReferralCode(searchParams.get("ref"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (ref) {
        const { error: redeemError } = await supabase.rpc("redeem_referral_code", {
          p_code: ref,
        });

        if (redeemError) {
          const params = new URLSearchParams({ ref, error: "invalid-code" });
          return NextResponse.redirect(`${origin}/complete-signup?${params.toString()}`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
