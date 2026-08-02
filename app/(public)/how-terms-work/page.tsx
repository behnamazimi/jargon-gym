import type { Metadata } from "next";
import { HowTermsWorkPage } from "@/components/content/how-terms-work-page";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "How terms are built",
  description:
    "Why I split jargon into definition, example, in practice, debated, and relationships, what knowing a term means, and how known and unknown work.",
};

export default async function HowTermsWorkRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <HowTermsWorkPage isLoggedIn={!!user} />;
}
