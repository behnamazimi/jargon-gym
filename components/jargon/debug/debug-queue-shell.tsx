"use client";

import { useSearchParams } from "next/navigation";
import { DebugViewTabs } from "@/components/jargon/debug/debug-view-tabs";
import {
  parseDebugContext,
  parseDebugView,
  QueueFilters,
  resolveDebugDomainId,
} from "@/components/jargon/debug/debug-queue-filters";
import type { StudyCollection } from "@/lib/study/types";

export function DebugQueueShell({ collections }: { collections: StudyCollection[] }) {
  const searchParams = useSearchParams();
  const context = parseDebugContext(searchParams.get("context") ?? undefined);
  const view = parseDebugView(searchParams.get("view") ?? undefined);
  const domainId = resolveDebugDomainId(searchParams.get("domain") ?? undefined, collections);

  return (
    <>
      <DebugViewTabs view={view} context={context} domainId={domainId} />
      {view === "queue" ? (
        <QueueFilters context={context} domainId={domainId} collections={collections} />
      ) : null}
    </>
  );
}
