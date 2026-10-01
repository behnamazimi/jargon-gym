import type { ImportFlowState } from "@/components/jargon/import/use-import-flow";
import { DOMAIN_LANGUAGE_OPTIONS } from "@/lib/jargon/languages";

/** Shown instead of the destination choice when another screen fixes it. */
export function FixedDestinationNote({ flow }: { flow: ImportFlowState }) {
  const language =
    DOMAIN_LANGUAGE_OPTIONS.find((option) => option.value === flow.language)?.label ??
    flow.language;
  return (
    <p className="m-0 text-sm text-base-content/70" role="status">
      New collection · {flow.newName} · {language}
    </p>
  );
}

/** Says why a delivery is held back while a card still has no definition. */
export function UnfinishedNote({ flow }: { flow: ImportFlowState }) {
  if (!flow.adapter?.requireAllDefinitions || flow.summary.toFinish === 0) return null;
  return (
    <p className="m-0 text-sm text-warning" role="status">
      {flow.adapter.unfinishedNote}
    </p>
  );
}
