import SignupForm from "./signup-form";
import { PageCenter } from "@/components/page-container";
import { normalizeReferralCode } from "@/lib/auth/referral-code";

type SignupPageProps = {
  searchParams: Promise<{ ref?: string; next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { ref, next } = await searchParams;
  const defaultReferenceCode = normalizeReferralCode(ref);

  return (
    <PageCenter>
      <SignupForm defaultReferenceCode={defaultReferenceCode} next={next} />
    </PageCenter>
  );
}
