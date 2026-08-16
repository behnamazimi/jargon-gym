import { DebugQueuePage } from "@/components/jargon/debug/debug-queue-page";
import {
  getDebugSetupData,
  listDebugScoredTermsAction,
  listDebugStrengthTermsAction,
} from "@/app/(private)/jargon/debug/actions";
import type { PickContext } from "@/lib/smart-queue/types";
import type { TermPoolStatus } from "@/lib/study/types";

export type DebugView = "strength" | "queue";

type PageProps = {
  searchParams: Promise<{ view?: string; status?: string; context?: string; domain?: string }>;
};

function parseView(value: string | undefined): DebugView {
  return value === "strength" ? "strength" : "queue";
}

function parseStatus(value: string | undefined): TermPoolStatus {
  return value === "known" ? "known" : "unknown";
}

function parseContext(value: string | undefined): PickContext {
  if (value === "read" || value === "quiz" || value === "review") return value;
  return "review";
}

export default async function JargonDebugPage({ searchParams }: PageProps) {
  const [
    { view: viewParam, status: statusParam, context: contextParam, domain: domainParam },
    setup,
  ] = await Promise.all([searchParams, getDebugSetupData()]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  const view = parseView(viewParam);
  const context = parseContext(contextParam);
  // Quiz debug is locked to the known pool — Quiz never inspects unknown terms.
  const status = context === "quiz" ? "known" : parseStatus(statusParam);
  const domainId =
    domainParam && setup.collections.some((collection) => collection.id === domainParam)
      ? domainParam
      : "all";

  if (setup.collections.length === 0) {
    return (
      <DebugQueuePage
        collections={setup.collections}
        view={view}
        status={status}
        context={context}
        domainId={domainId}
        rows={[]}
        strengthRows={[]}
        errorMessage={null}
      />
    );
  }

  const scopedDomainIds = domainId === "all" ? "all" : [domainId];

  if (view === "strength") {
    const strength = await listDebugStrengthTermsAction(scopedDomainIds);
    return (
      <DebugQueuePage
        collections={setup.collections}
        view={view}
        status={status}
        context={context}
        domainId={domainId}
        rows={[]}
        strengthRows={strength.rows ?? []}
        errorMessage={strength.error ?? null}
      />
    );
  }

  const scored = await listDebugScoredTermsAction(scopedDomainIds, status, context);

  return (
    <DebugQueuePage
      collections={setup.collections}
      view={view}
      status={status}
      context={context}
      domainId={domainId}
      rows={scored.rows ?? []}
      strengthRows={[]}
      errorMessage={scored.error ?? null}
    />
  );
}
