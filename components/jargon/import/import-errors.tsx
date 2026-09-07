import { JargonErrorAlert } from "@/components/jargon/shared/error-alert";
import type { ImportFailure } from "@/lib/jargon/import/types";

type ImportFailurePanelProps = {
  failure: ImportFailure;
};

export function ImportFailurePanel({ failure }: ImportFailurePanelProps) {
  return <JargonErrorAlert error={failure} className="shadow-surface rounded-2xl" />;
}
