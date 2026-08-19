import type { Metadata } from "next";
import { BeforeYouSignUpPage } from "@/components/content/before-you-sign-up-page";
import { getSessionUser } from "@/lib/auth/require-session";

export const metadata: Metadata = {
  title: "Before you sign up",
  description:
    "What Jargon Gym actually is, why it's built the way it is, and what to expect before you request an invite.",
};

export default async function BeforeYouSignUpRoute() {
  const { user } = await getSessionUser();

  return <BeforeYouSignUpPage isLoggedIn={!!user} />;
}
