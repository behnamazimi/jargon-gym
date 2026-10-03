import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { QuizPage } from "@/components/quiz/quiz-page";
import { getQuizSetupData } from "@/app/(private)/jargon/quiz/actions";
import {
  parseQuizSetupCookie,
  QUIZ_SETUP_COOKIE,
  resolveInitialQuizSetup,
} from "@/lib/quiz/setup-preference";
import { aiAvailable } from "@/lib/llm/types";
import { hasNoCollections } from "@/lib/study/collections";

export const maxDuration = 60;

type PageProps = {
  searchParams: Promise<{ domain?: string }>;
};

export default async function JargonQuizPage({ searchParams }: PageProps) {
  const [params, setup, cookieStore] = await Promise.all([
    searchParams,
    getQuizSetupData(),
    cookies(),
  ]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/70">{setup.error}</p>;
  }
  if (hasNoCollections({ active: setup.collections, paused: setup.paused })) redirect("/jargon");

  const activeIds = setup.collections.map((collection) => collection.id);
  const initialSetup = resolveInitialQuizSetup({
    saved: parseQuizSetupCookie(cookieStore.get(QUIZ_SETUP_COOKIE)?.value),
    domainParam: params.domain,
    activeIds,
    aiAvailable: aiAvailable(setup.ai),
  });

  return (
    <QuizPage
      // Resuming a paused collection refreshes the page; a new active set
      // remounts it so the setup picks up the new collections.
      key={activeIds.join(",")}
      ai={setup.ai}
      collections={setup.collections}
      paused={setup.paused}
      initialSetup={initialSetup}
    />
  );
}
