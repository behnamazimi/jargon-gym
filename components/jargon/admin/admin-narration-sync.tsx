"use client";

import { useState } from "react";
import {
  cancelNarrationSyncJob,
  getNarrationSyncCoverage,
  getNarrationSyncStatus,
  resumeNarrationSync,
  startNarrationSync,
} from "@/app/(private)/admin/narration/actions";
import { AdminSection } from "@/components/admin/admin-section";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { JobPanel, SyncToolbar } from "@/components/jargon/admin/admin-narration-sync-parts";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useInterval } from "@/hooks/use-interval";
import { settleAdminAction } from "@/lib/admin/settle-action";
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

export function AdminNarrationSync({
  enabled: narrationEnabled,
  coverage: initialCoverage,
  lastJob: initialJob,
}: AdminNarrationSyncProps) {
  const [coverage, setCoverage] = useState(initialCoverage);
  const [selectedId, setSelectedId] = useState(initialCoverage[0]?.domainId ?? "");
  const [job, setJob] = useState(initialJob);
  const [pollError, setPollError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const { run, isPending, error, clearError } = useAdminAction();

  const selected = coverage.find((row) => row.domainId === selectedId);
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
        if (!status.data || isActiveNarrationSyncStatus(status.data.status)) return;
        const refreshed = await settleAdminAction(() =>
          getNarrationSyncCoverage(coverage.map((row) => ({ id: row.domainId, name: row.name }))),
        );
        if (refreshed.ok) setCoverage(refreshed.data);
        else setPollError(refreshed.error);
      })();
    },
    active ? POLL_MS : null,
  );

  async function handleResume() {
    const resumed = await run(resumeNarrationSync);
    if (!resumed) return;
    const status = await settleAdminAction(getNarrationSyncStatus);
    if (status.ok) setJob(status.data);
  }

  return (
    <AdminSection
      id="narration-sync"
      title="Audio sync"
      description="Generate missing term audio for one collection. Closing this page does not stop a run."
    >
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
        onStart={() => {
          if (!selectedId) return;
          clearError();
          void run(() => startNarrationSync(selectedId), { onSuccess: setJob });
        }}
        onCancel={() => setCancelling(true)}
        onResume={() => void handleResume()}
      />

      {error || pollError ? (
        <p role="alert" className="m-0 text-sm text-error">
          {error ?? pollError}
        </p>
      ) : null}
      {job ? <JobPanel job={job} /> : null}

      <ConfirmDialog
        isOpen={cancelling}
        onOpenChange={setCancelling}
        title="Cancel this sync?"
        description="Clips already made are kept. You can start again later."
        confirmLabel="Cancel sync"
        onConfirm={() => void run(cancelNarrationSyncJob, { onSuccess: setJob })}
      />
    </AdminSection>
  );
}
