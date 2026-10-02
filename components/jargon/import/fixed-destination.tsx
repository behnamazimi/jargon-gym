import type { ImportFlowState } from "@/components/jargon/import/use-import-flow";
import { DOMAIN_LANGUAGE_OPTIONS } from "@/lib/jargon/languages";

/** Shown instead of the destination choice when another screen fixes it. */
export function FixedDestinationNote({ flow }: { flow: ImportFlowState }) {
  const fixed = flow.adapter?.destination;
  if (!fixed) return null;
  if (flow.adapter?.destinationNote) {
    return (
      <p className="m-0 text-sm text-base-content/70" role="status">
        {flow.adapter.destinationNote}
      </p>
    );
  }
  const language =
    DOMAIN_LANGUAGE_OPTIONS.find((option) => option.value === fixed.language)?.label ??
    fixed.language;
  return (
    <p className="m-0 text-sm text-base-content/70" role="status">
      New collection · {fixed.name} · {language}
    </p>
  );
}

/** Says why a delivery is held back while a card still has no definition. */
export function UnfinishedNote({ flow }: { flow: ImportFlowState }) {
  if (!flow.adapter?.requireAllDefinitions || flow.summary.toFinish === 0) return null;
  return (
    <p className="m-0 text-sm text-warning-text" role="status">
      {flow.adapter.unfinishedNote}
    </p>
  );
}
