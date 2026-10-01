import { Alert, AlertDescription } from "@/components/ui/alert";
import type {
  CollectionNarrationCoverage,
  NarrationSyncJobView,
} from "@/lib/narration/sync-shared";

export function SyncToolbar({
  coverage,
  selectedId,
  selected,
  narrationEnabled,
  active,
  showResume,
  isPending,
  onSelect,
  onStart,
  onCancel,
  onResume,
}: {
  coverage: CollectionNarrationCoverage[];
  selectedId: string;
  selected: CollectionNarrationCoverage | undefined;
  narrationEnabled: boolean;
  active: boolean;
  showResume: boolean;
  isPending: boolean;
  onSelect: (id: string) => void;
  onStart: () => void;
  onCancel: () => void;
  onResume: () => void;
}) {
  const startDisabled =
    isPending || !narrationEnabled || !selected || selected.missingCount === 0 || active;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-medium text-base-content">Collection</span>
        <select
          className="select w-full"
          value={selectedId}
          disabled={isPending || active || coverage.length === 0}
          onChange={(event) => onSelect(event.target.value)}
        >
          {coverage.length === 0 ? <option value="">No collections</option> : null}
          {coverage.map((row) => (
            <option key={row.domainId} value={row.domainId}>
              {row.name} ({row.missingCount} missing)
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="button" className="btn" disabled={startDisabled} onClick={onStart}>
          {isPending && !active ? "Starting…" : "Start"}
        </button>
        {active ? (
          <button type="button" className="btn" disabled={isPending} onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        {showResume ? (
          <button type="button" className="btn" disabled={isPending} onClick={onResume}>
            Resume
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function JobPanel({ job }: { job: NarrationSyncJobView }) {
  const total = job.total;
  const done = Math.min(job.cursor, total);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-base-300 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 font-medium text-base-content">{job.domainName}</p>
        <span className="badge">{job.status}</span>
      </div>
      <progress className="progress" value={done} max={total || 1} />
      <p className="m-0 text-sm text-base-content/65">
        {done}/{total} · {job.generatedCount} generated · {job.failedCount} failed
      </p>
      {job.lastError ? (
        <Alert variant="destructive">
          <AlertDescription>{job.lastError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
