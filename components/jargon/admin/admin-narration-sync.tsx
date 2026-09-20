"use client";

import { useState, useTransition } from "react";
import {
  cancelNarrationSyncJob,
  getNarrationSyncCoverage,
  getNarrationSyncStatus,
  resumeNarrationSync,
  startNarrationSync,
} from "@/app/(private)/admin/narration/actions";
import { useInterval } from "@/hooks/use-interval";
import {
  canResumeNarrationSync,
  isActiveNarrationSyncStatus,
  type CollectionNarrationCoverage,
  type NarrationSyncJobView,
} from "@/lib/narration/sync-shared";

const POLL_MS = 2000;

type AdminNarrationSyncProps = {
  enabled: boolean;
  coverage: CollectionNarrationCoverage[];
  lastJob: NarrationSyncJobView | null;
};

function actionError(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export function AdminNarrationSync({
  enabled: narrationEnabled,
  coverage: initialCoverage,
  lastJob: initialJob,
}: AdminNarrationSyncProps) {
  const [coverage, setCoverage] = useState(initialCoverage);
  const [selectedId, setSelectedId] = useState(initialCoverage[0]?.domainId ?? "");
  const [job, setJob] = useState(initialJob);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = coverage.find((row) => row.domainId === selectedId);
  const active = Boolean(job && isActiveNarrationSyncStatus(job.status));

  useInterval(
    () => {
      startTransition(async () => {
        try {
          const next = await getNarrationSyncStatus();
          setJob(next);
          if (!next || isActiveNarrationSyncStatus(next.status)) return;
          setCoverage(
            await getNarrationSyncCoverage(
              coverage.map((row) => ({ id: row.domainId, name: row.name })),
            ),
          );
        } catch (err) {
          setError(actionError(err, "Failed to refresh status."));
        }
      });
    },
    active ? POLL_MS : null,
  );

  function run(fallback: string, work: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await work();
      } catch (err) {
        setError(actionError(err, fallback));
      }
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="m-0 text-lg font-medium text-base-content">Audio sync</h2>
        <p className="mt-1 text-sm text-base-content/65">
          Generate missing term audio for one collection. Closing this page does not stop a run.
        </p>
      </div>

      {narrationEnabled ? null : (
        <div role="alert" className="alert alert-warning">
          Turn narration on above before starting a sync.
        </div>
      )}

      <SyncToolbar
        coverage={coverage}
        selectedId={selectedId}
        selected={selected}
        narrationEnabled={narrationEnabled}
        active={active}
        showResume={canResumeNarrationSync(job)}
        isPending={isPending}
        onSelect={setSelectedId}
        onStart={() =>
          run("Failed to start.", async () => {
            if (!selectedId) return;
            setJob(await startNarrationSync(selectedId));
          })
        }
        onCancel={() =>
          run("Failed to cancel.", async () => {
            setJob(await cancelNarrationSyncJob());
          })
        }
        onResume={() =>
          run("Failed to resume.", async () => {
            await resumeNarrationSync();
            setJob(await getNarrationSyncStatus());
          })
        }
      />

      {error ? <p className="m-0 text-sm text-error">{error}</p> : null}
      {job ? <JobPanel job={job} /> : null}
    </section>
  );
}

function SyncToolbar({
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

function JobPanel({ job }: { job: NarrationSyncJobView }) {
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
        <div role="alert" className="alert alert-error">
          {job.lastError}
        </div>
      ) : null}
    </div>
  );
}
