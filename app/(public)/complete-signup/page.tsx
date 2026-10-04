import { PageCenter } from "@/components/page-container";
import { normalizeReferralCode } from "@/lib/auth/referral-code";
import { getSessionUser } from "@/lib/auth/require-session";
import CompleteSignupForm from "./complete-signup-form";

type CompleteSignupPageProps = {
  searchParams: Promise<{ ref?: string; error?: string; next?: string }>;
};

const INVALID_REFERRAL_ERROR = "That reference code isn't valid, was already used, or has run out.";

/** True when the code they signed up with filled up or expired before they confirmed their email. */
async function readCodeRanOut(): Promise<boolean> {
  const { supabase, user } = await getSessionUser();
  if (!user) return false;
  const { data } = await supabase
    .from("users")
    .select("referral_code_ran_out")
    .eq("id", user.id)
    .maybeSingle();
  return data?.referral_code_ran_out ?? false;
}

export default async function CompleteSignupPage({ searchParams }: CompleteSignupPageProps) {
  const { ref, error, next } = await searchParams;
  const defaultReferenceCode = normalizeReferralCode(ref);
  const initialError = error === "invalid-code" ? INVALID_REFERRAL_ERROR : null;

  const codeRanOut = await readCodeRanOut();

  return (
    <PageCenter>
      <CompleteSignupForm
        codeRanOut={codeRanOut}
        defaultReferenceCode={defaultReferenceCode}
        initialError={initialError}
        next={next}
      />
    </PageCenter>
  );
}
