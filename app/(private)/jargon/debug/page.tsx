import { DebugQueuePage } from "@/components/jargon/debug/debug-queue-page";
import {
  getDebugSetupData,
  listDebugScoredTermsAction,
} from "@/app/(private)/jargon/debug/actions";
import type { PickContext } from "@/lib/smart-queue/types";
import type { TermPoolStatus } from "@/lib/study/types";

type PageProps = {
  searchParams: Promise<{ status?: string; context?: string; domain?: string }>;
};

function parseStatus(value: string | undefined): TermPoolStatus {
  return value === "known" ? "known" : "unknown";
}

function parseContext(value: string | undefined): PickContext {
  if (value === "read" || value === "quiz" || value === "review") return value;
  return "review";
}

export default async function JargonDebugPage({ searchParams }: PageProps) {
  const [{ status: statusParam, context: contextParam, domain: domainParam }, setup] =
    await Promise.all([searchParams, getDebugSetupData()]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  const status = parseStatus(statusParam);
  const context = parseContext(contextParam);
  const domainId =
    domainParam && setup.collections.some((collection) => collection.id === domainParam)
      ? domainParam
      : "all";

  if (setup.collections.length === 0) {
    return (
      <DebugQueuePage
        collections={setup.collections}
        status={status}
        context={context}
        domainId={domainId}
        rows={[]}
        errorMessage={null}
      />
    );
  }

  const scored = await listDebugScoredTermsAction(
    domainId === "all" ? "all" : [domainId],
    status,
    context,
  );

  return (
    <DebugQueuePage
      collections={setup.collections}
      status={status}
      context={context}
      domainId={domainId}
      rows={scored.rows ?? []}
      errorMessage={scored.error ?? null}
    />
  );
}
