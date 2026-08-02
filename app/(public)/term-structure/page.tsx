import type { Metadata } from "next";
import { TermFieldsGuidePage } from "@/components/content/term-fields-guide-page";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "How terms are built",
  description:
    "Why I split jargon into definition, example, in practice, debated, and relationships — what each field is for and when to fill it.",
};

export default async function TermFieldsGuideRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <TermFieldsGuidePage isLoggedIn={!!user} />;
}
