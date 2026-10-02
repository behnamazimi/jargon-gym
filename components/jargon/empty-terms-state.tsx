import { FilePlus } from "lucide-react";
import { EmptyState } from "@/components/jargon/empty-state";
import { LinkButton } from "@/components/ui/button";

export function EmptyTermsState({ domainId }: { domainId: string }) {
  return (
    <EmptyState
      icon={FilePlus}
      title="No terms yet"
      description="Add your first term, or import a list."
      className="py-10"
    >
      <div className="flex flex-wrap items-center justify-center gap-3">
        <LinkButton href={`/jargon/capture?to=${domainId}`}>Add a term</LinkButton>
        <LinkButton href="/jargon/import" variant="outline">
          Import terms
        </LinkButton>
      </div>
    </EmptyState>
  );
}
