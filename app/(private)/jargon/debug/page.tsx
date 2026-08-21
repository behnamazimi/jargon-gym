import { DebugQueuePage } from "@/components/jargon/debug/debug-queue-page";
import {
  getDebugSetupData,
  listDebugScoredTermsAction,
} from "@/app/(private)/jargon/debug/actions";
import type { PickContext } from "@/lib/smart-queue/types";

type PageProps = {
  searchParams: Promise<{ context?: string; domain?: string }>;
};

function parseContext(value: string | undefined): PickContext {
  if (value === "read" || value === "quiz" || value === "review") return value;
  return "review";
}

export default async function JargonDebugPage({ searchParams }: PageProps) {
  const [{ context: contextParam, domain: domainParam }, setup] = await Promise.all([
    searchParams,
    getDebugSetupData(),
  ]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  const context = parseContext(contextParam);
  const domainId =
    domainParam && setup.collections.some((collection) => collection.id === domainParam)
      ? domainParam
      : "all";

  if (setup.collections.length === 0) {
    return (
      <DebugQueuePage
        collections={setup.collections}
        context={context}
        domainId={domainId}
        rows={[]}
        mix={null}
        insight={[]}
        errorMessage={null}
      />
    );
  }

  const scored = await listDebugScoredTermsAction(domainId === "all" ? "all" : [domainId], context);

  return (
    <DebugQueuePage
      collections={setup.collections}
      context={context}
      domainId={domainId}
      rows={scored.rows ?? []}
      mix={scored.mix ?? null}
      insight={scored.insight ?? []}
      errorMessage={scored.error ?? null}
    />
  );
}
