import { PageCenter } from "@/components/page-container";
import { normalizeReferralCode } from "@/lib/auth/referral-code";
import CompleteSignupForm from "./complete-signup-form";

type CompleteSignupPageProps = {
  searchParams: Promise<{ ref?: string; error?: string }>;
};

const INVALID_REFERRAL_ERROR = "Invalid or already used reference code.";

export default async function CompleteSignupPage({ searchParams }: CompleteSignupPageProps) {
  const { ref, error } = await searchParams;
  const defaultReferenceCode = normalizeReferralCode(ref);
  const initialError = error === "invalid-code" ? INVALID_REFERRAL_ERROR : null;

  return (
    <PageCenter>
      <CompleteSignupForm defaultReferenceCode={defaultReferenceCode} initialError={initialError} />
    </PageCenter>
  );
}
