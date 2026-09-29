import { Suspense } from "react";
import { getDebugSetupData } from "@/app/(private)/admin/system/queue/actions";
import { DebugQueueEmpty } from "@/components/jargon/debug/debug-queue-page";
import { DebugQueueShell } from "@/components/jargon/debug/debug-queue-shell";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PanelSkeleton } from "@/components/page-skeleton";

async function DebugLayoutBody({ children }: { children: React.ReactNode }) {
  const setup = await getDebugSetupData();
  if ("error" in setup) {
    return <p className="text-sm text-base-content/60">{setup.error}</p>;
  }
  if (setup.collections.length === 0) {
    return <DebugQueueEmpty />;
  }

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <DebugQueueShell collections={setup.collections} />
      </Suspense>
      {children}
    </div>
  );
}

export default function DebugLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminPageHeader
        title="Queue debug"
        description="Every term's TRACE score and signals, for debugging the ranking, not for studying. Shows your own queue."
      />
      <Suspense fallback={<PanelSkeleton />}>
        <DebugLayoutBody>{children}</DebugLayoutBody>
      </Suspense>
    </>
  );
}
