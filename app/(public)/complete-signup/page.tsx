import { PageCenter } from "@/components/page-container";
import { normalizeReferralCode } from "@/lib/auth/referral-code";
import CompleteSignupForm from "./complete-signup-form";

type CompleteSignupPageProps = {
  searchParams: Promise<{ ref?: string; error?: string; next?: string }>;
};

const INVALID_REFERRAL_ERROR = "That reference code isn't valid or was already used.";

export default async function CompleteSignupPage({ searchParams }: CompleteSignupPageProps) {
  const { ref, error, next } = await searchParams;
  const defaultReferenceCode = normalizeReferralCode(ref);
  const initialError = error === "invalid-code" ? INVALID_REFERRAL_ERROR : null;

  return (
    <PageCenter>
      <CompleteSignupForm
        defaultReferenceCode={defaultReferenceCode}
        initialError={initialError}
        next={next}
      />
    </PageCenter>
  );
}
