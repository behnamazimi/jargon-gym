import {
  getNextReadTermAction,
  getReadSetupData,
  getReadTermByIdAction,
} from "@/app/(private)/jargon/read/actions";
import { HintPopover } from "@/components/jargon/hint-popover";
import { ReadPage } from "@/components/jargon/read/read-page";
import { loadStudyHints } from "@/lib/hints/load-study-hints";
import type { StudyCollection } from "@/lib/study/types";

type PageProps = {
  searchParams: Promise<{ termId?: string; alreadyRead?: string; domain?: string }>;
};

function resolveReadCollectionId(
  domainParam: string | undefined,
  collections: StudyCollection[],
): string {
  if (domainParam && collections.some((collection) => collection.id === domainParam)) {
    return domainParam;
  }
  return "all";
}

export default async function JargonReadPage({ searchParams }: PageProps) {
  const [params, setup, hints] = await Promise.all([
    searchParams,
    getReadSetupData(),
    loadStudyHints(),
  ]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">Log in to read terms.</p>;
  }

  const domainId = resolveReadCollectionId(params.domain, setup.collections);
  const initialResult = params.termId
    ? await getReadTermByIdAction(params.termId, params.alreadyRead === "true")
    : await getNextReadTermAction(domainId);

  if (initialResult.error === "Log in to continue.") {
    return <p className="text-sm text-base-content/60">Log in to read terms.</p>;
  }

  return (
    <>
      <ReadPage initialResult={initialResult} collections={setup.collections} domainId={domainId} />
      {hints.length > 0 ? <HintPopover hints={hints} /> : null}
    </>
  );
}
