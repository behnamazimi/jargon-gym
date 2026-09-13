import { Suspense } from "react";
import { DebugQueueContent } from "@/components/jargon/debug/debug-queue-page";
import {
  parseDebugContext,
  parseDebugView,
  resolveDebugDomainId,
} from "@/components/jargon/debug/debug-queue-filters";
import {
  getCalibrationSummaryAction,
  getDebugSetupData,
  listDebugScoredTermsAction,
} from "@/app/(private)/jargon/debug/actions";
import { PanelSkeleton } from "@/components/page-skeleton";
import type { PickContext } from "@/lib/trace-queue";

type DebugView = "queue" | "calibration";

type PageProps = {
  searchParams: Promise<{ context?: string; domain?: string; view?: string }>;
};

type SetupData = Extract<Awaited<ReturnType<typeof getDebugSetupData>>, { collections: unknown }>;

async function DebugCalibrationContent({
  setup,
  context,
  domainId,
  view,
}: {
  setup: SetupData;
  context: PickContext;
  domainId: string;
  view: DebugView;
}) {
  const summary = await getCalibrationSummaryAction();
  return (
    <DebugQueueContent
      collections={setup.collections}
      context={context}
      domainId={domainId}
      view={view}
      rows={[]}
      coolingDown={[]}
      calibration={summary.data ?? null}
      errorMessage={summary.error ?? null}
    />
  );
}

async function DebugQueueTableContent({
  setup,
  context,
  domainId,
  view,
}: {
  setup: SetupData;
  context: PickContext;
  domainId: string;
  view: DebugView;
}) {
  const scored = await listDebugScoredTermsAction(domainId === "all" ? "all" : [domainId], context);
  return (
    <DebugQueueContent
      collections={setup.collections}
      context={context}
      domainId={domainId}
      view={view}
      rows={scored.rows ?? []}
      coolingDown={scored.coolingDown ?? []}
      calibration={null}
      errorMessage={scored.error ?? null}
    />
  );
}

export default async function JargonDebugPage({ searchParams }: PageProps) {
  const [{ context: contextParam, domain: domainParam, view: viewParam }, setup] =
    await Promise.all([searchParams, getDebugSetupData()]);

  if ("error" in setup || setup.collections.length === 0) {
    return null;
  }

  const context = parseDebugContext(contextParam);
  const view = parseDebugView(viewParam);
  const domainId = resolveDebugDomainId(domainParam, setup.collections);

  return (
    <Suspense key={`${view}:${context}:${domainId}`} fallback={<PanelSkeleton />}>
      {view === "calibration" ? (
        <DebugCalibrationContent setup={setup} context={context} domainId={domainId} view={view} />
      ) : (
        <DebugQueueTableContent setup={setup} context={context} domainId={domainId} view={view} />
      )}
    </Suspense>
  );
}
