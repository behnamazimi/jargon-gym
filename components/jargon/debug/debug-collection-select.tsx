"use client";

import { CollectionSelect } from "@/components/jargon/collection-select";
import type { PickContext } from "@/lib/trace-queue";
import type { StudyCollection } from "@/lib/study/types";
import { debugQueueHref } from "./debug-queue-page";

type DebugCollectionSelectProps = {
  collections: StudyCollection[];
  domainId: string;
  context: PickContext;
};

export function DebugCollectionSelect({
  collections,
  domainId,
  context,
}: DebugCollectionSelectProps) {
  return (
    <CollectionSelect
      mode="url"
      triggerClassName="text-sm"
      collections={collections}
      value={domainId}
      leadingOption={{ id: "all", label: "All active collections" }}
      hrefBuilder={(id) => debugQueueHref({ context, domainId: id })}
    />
  );
}
