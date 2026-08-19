import SignupForm from "./signup-form";
import { PageCenter } from "@/components/page-container";
import { normalizeReferralCode } from "@/lib/auth/referral-code";

type SignupPageProps = {
  searchParams: Promise<{ ref?: string; email?: string; next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { ref, email, next } = await searchParams;
  const defaultReferenceCode = normalizeReferralCode(ref);
  const defaultEmail = email?.trim() ?? "";

  return (
    <PageCenter>
      <SignupForm
        defaultReferenceCode={defaultReferenceCode}
        defaultEmail={defaultEmail}
        next={next}
      />
    </PageCenter>
  );
}
