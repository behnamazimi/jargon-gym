"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  cancelNarrationSyncJob,
  getNarrationSyncStatus,
  resumeNarrationSync,
  startNarrationSync,
} from "@/app/(private)/admin/ai/narration/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useInterval } from "@/hooks/use-interval";
import { settleAdminAction } from "@/lib/admin/settle-action";
import {
  canResumeNarrationSync,
  isActiveNarrationSyncStatus,
  type NarrationSyncJobView,
} from "@/lib/narration/sync-shared";

const POLL_MS = 2000;

function JobPanel({ job }: { job: NarrationSyncJobView }) {
  const done = Math.min(job.cursor, job.total);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-base-300 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 font-medium text-base-content">{job.collectionName}</p>
        <span className="badge">{job.status}</span>
      </div>
      <progress className="progress" value={done} max={job.total || 1} />
      <p className="m-0 text-sm text-base-content/65">
        {done}/{job.total} · {job.generatedCount} generated · {job.failedCount} failed
      </p>
      {job.lastError ? (
        <Alert variant="destructive">
          <AlertDescription>{job.lastError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function SyncNotices({
  narrationEnabled,
  otherRunning,
}: {
  narrationEnabled: boolean;
  otherRunning: { id: string; name: string } | null;
}) {
  return (
    <>
      {narrationEnabled ? null : (
        <Alert variant="warning">
          <AlertDescription>
            Narration is turned off, so a sync can't start. Turn it on in{" "}
            <Link href="/admin/ai/narration" className="link">
              Narration settings
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}
      {otherRunning ? (
        <Alert variant="warning">
          <AlertDescription>
            A sync is already running for{" "}
            <Link href={`/admin/collections/${otherRunning.id}#narration`} className="link">
              {otherRunning.name}
            </Link>
            . Only one runs at a time.
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

function SyncStatus({
  message,
  job,
}: {
  message: string | null;
  job: NarrationSyncJobView | null;
}) {
  return (
    <>
      {message ? (
        <p role="alert" className="m-0 text-sm text-error">
          {message}
        </p>
      ) : null}
      {job ? <JobPanel job={job} /> : null}
    </>
  );
}

function useNarrationSync(lastJob: NarrationSyncJobView | null) {
  const router = useRouter();
  const [job, setJob] = useState(lastJob);
  const [pollError, setPollError] = useState<string | null>(null);
  const action = useAdminAction();
  const active = Boolean(job && isActiveNarrationSyncStatus(job.status));

  // The poller stays outside `useAdminAction`: it runs every two seconds and must not toast or flag pending.
  useInterval(
    () => {
      void (async () => {
        const status = await settleAdminAction(getNarrationSyncStatus);
        if (!status.ok) {
          setPollError(status.error);
          return;
        }
        setPollError(null);
        setJob(status.data);
        if (status.data && !isActiveNarrationSyncStatus(status.data.status)) router.refresh();
      })();
    },
    active ? POLL_MS : null,
  );

  async function resume() {
    if (!(await action.run(resumeNarrationSync))) return;
    const status = await settleAdminAction(getNarrationSyncStatus);
    if (status.ok) setJob(status.data);
  }

  return { job, setJob, active, pollError, resume, ...action };
}

function SyncButtons({
  startLabel,
  startDisabled,
  busy,
  showCancel,
  showResume,
  onStart,
  onCancel,
  onResume,
}: {
  startLabel: string;
  startDisabled: boolean;
  busy: boolean;
  showCancel: boolean;
  showResume: boolean;
  onStart: () => void;
  onCancel: () => void;
  onResume: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn" disabled={startDisabled} onClick={onStart}>
        {startLabel}
      </button>
      {showCancel ? (
        <button type="button" className="btn" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      ) : null}
      {showResume ? (
        <button type="button" className="btn" disabled={busy} onClick={onResume}>
          Resume
        </button>
      ) : null}
    </div>
  );
}

/** Only one sync can run at a time, across all collections, so the last job may belong to another one. */
export function NarrationSyncPanel({
  collectionId,
  narrationEnabled,
  needsAudioCount,
  lastJob,
}: {
  collectionId: string;
  narrationEnabled: boolean;
  needsAudioCount: number;
  lastJob: NarrationSyncJobView | null;
}) {
  const sync = useNarrationSync(lastJob);
  const [cancelling, setCancelling] = useState(false);
  const { job, active, isPending } = sync;
  const mine = job?.collectionId === collectionId;
  const message = sync.error ?? sync.pollError;

  return (
    <div className="flex flex-col gap-3">
      <SyncNotices
        narrationEnabled={narrationEnabled}
        otherRunning={
          active && !mine && job ? { id: job.collectionId, name: job.collectionName } : null
        }
      />
      <SyncButtons
        startLabel={isPending && !active ? "Starting…" : `Make ${needsAudioCount} missing or stale`}
        startDisabled={isPending || !narrationEnabled || needsAudioCount === 0 || active}
        busy={isPending}
        showCancel={active && mine}
        showResume={mine && canResumeNarrationSync(job)}
        onStart={() => {
          sync.clearError();
          void sync.run(() => startNarrationSync(collectionId), { onSuccess: sync.setJob });
        }}
        onCancel={() => setCancelling(true)}
        onResume={() => void sync.resume()}
      />
      <SyncStatus message={message} job={mine ? job : null} />

      <ConfirmDialog
        isOpen={cancelling}
        onOpenChange={setCancelling}
        title="Cancel this sync?"
        description="Clips already made are kept. You can start again later."
        confirmLabel="Cancel sync"
        onConfirm={() => void sync.run(cancelNarrationSyncJob, { onSuccess: sync.setJob })}
      />
    </div>
  );
}
