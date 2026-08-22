import { QuizPage } from "@/components/jargon/quiz/quiz-page";
import { getQuizSetupData } from "@/app/(private)/jargon/quiz/actions";
import type { StudyCollection } from "@/lib/study/types";

type PageProps = {
  searchParams: Promise<{ domain?: string }>;
};

function resolveQuizCollectionId(
  domainParam: string | undefined,
  collections: StudyCollection[],
): string {
  if (domainParam && collections.some((collection) => collection.id === domainParam)) {
    return domainParam;
  }
  return "all";
}

export default async function JargonQuizPage({ searchParams }: PageProps) {
  const [params, setup] = await Promise.all([searchParams, getQuizSetupData()]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  const domainId = resolveQuizCollectionId(params.domain, setup.collections);

  return (
    <QuizPage
      llmConfigured={setup.llmConfigured}
      providerLabel={setup.providerLabel}
      collections={setup.collections}
      initialDomainId={domainId}
    />
  );
}
