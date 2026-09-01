import { DebugQueuePage } from "@/components/jargon/debug/debug-queue-page";
import {
  getCalibrationSummaryAction,
  getDebugSetupData,
  listDebugScoredTermsAction,
} from "@/app/(private)/jargon/debug/actions";
import type { PickContext } from "@/lib/trace-queue";

type DebugView = "queue" | "calibration";

type PageProps = {
  searchParams: Promise<{ context?: string; domain?: string; view?: string }>;
};

function parseContext(value: string | undefined): PickContext {
  if (value === "read" || value === "quiz" || value === "review") return value;
  return "review";
}

function parseView(value: string | undefined): DebugView {
  return value === "calibration" ? "calibration" : "queue";
}

export default async function JargonDebugPage({ searchParams }: PageProps) {
  const [{ context: contextParam, domain: domainParam, view: viewParam }, setup] =
    await Promise.all([searchParams, getDebugSetupData()]);

  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }

  const context = parseContext(contextParam);
  const view = parseView(viewParam);
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
        view={view}
        rows={[]}
        calibration={null}
        errorMessage={null}
      />
    );
  }

  if (view === "calibration") {
    const summary = await getCalibrationSummaryAction();
    return (
      <DebugQueuePage
        collections={setup.collections}
        context={context}
        domainId={domainId}
        view={view}
        rows={[]}
        calibration={summary.data ?? null}
        errorMessage={summary.error ?? null}
      />
    );
  }

  const scored = await listDebugScoredTermsAction(domainId === "all" ? "all" : [domainId], context);

  return (
    <DebugQueuePage
      collections={setup.collections}
      context={context}
      domainId={domainId}
      view={view}
      rows={scored.rows ?? []}
      calibration={null}
      errorMessage={scored.error ?? null}
    />
  );
}
