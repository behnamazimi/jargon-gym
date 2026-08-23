import { HintPopover } from "@/components/jargon/hint-popover";
import { QuizPage } from "@/components/jargon/quiz/quiz-page";
import { getQuizSetupData } from "@/app/(private)/jargon/quiz/actions";
import { loadStudyHints } from "@/lib/hints/load-study-hints";
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
  const [params, setup, hints] = await Promise.all([
    searchParams,
    getQuizSetupData(),
    loadStudyHints(),
  ]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  const domainId = resolveQuizCollectionId(params.domain, setup.collections);

  return (
    <>
      <QuizPage
        llmConfigured={setup.llmConfigured}
        providerLabel={setup.providerLabel}
        collections={setup.collections}
        initialDomainId={domainId}
      />
      {hints.length > 0 ? <HintPopover hints={hints} /> : null}
    </>
  );
}
