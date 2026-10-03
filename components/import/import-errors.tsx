import { JargonErrorAlert } from "@/components/shared/error-alert";
import type { ImportFailure } from "@/lib/import/types";

type ImportFailurePanelProps = {
  failure: ImportFailure;
};

export function ImportFailurePanel({ failure }: ImportFailurePanelProps) {
  return <JargonErrorAlert error={failure} className="shadow-surface rounded-box" />;
}
