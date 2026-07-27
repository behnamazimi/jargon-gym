import { QuizPage } from "@/components/jargon/quiz/quiz-page";
import { getQuizSetupData } from "@/app/(private)/jargon/quiz/actions";
import { createClient } from "@/lib/supabase/server";

export default async function JargonQuizPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-sm text-base-content/60">Log in to take a quiz.</p>
      </div>
    );
  }

  const setup = await getQuizSetupData();

  if ("error" in setup) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-sm text-base-content/60">{setup.error}</p>
      </div>
    );
  }

  return (
    <QuizPage
      llmConfigured={setup.llmConfigured}
      providerLabel={setup.providerLabel}
      collections={setup.collections}
    />
  );
}
