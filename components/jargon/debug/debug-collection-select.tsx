"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PickContext } from "@/lib/smart-queue/types";
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
  const router = useRouter();

  return (
    <Select
      selectedKey={domainId}
      onSelectionChange={(key) => router.push(debugQueueHref({ context, domainId: String(key) }))}
    >
      <SelectTrigger className="text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem id="all">All active collections</SelectItem>
        {collections.map((collection) => (
          <SelectItem key={collection.id} id={collection.id}>
            {collection.name} ({collection.unknownCount} unknown · {collection.knownCount} known)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
