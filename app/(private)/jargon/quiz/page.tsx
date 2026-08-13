import { QuizPage } from "@/components/jargon/quiz/quiz-page";
import { getQuizSetupData } from "@/app/(private)/jargon/quiz/actions";

export default async function JargonQuizPage() {
  const setup = await getQuizSetupData();

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  return (
    <QuizPage
      llmConfigured={setup.llmConfigured}
      providerLabel={setup.providerLabel}
      collections={setup.collections}
    />
  );
}
