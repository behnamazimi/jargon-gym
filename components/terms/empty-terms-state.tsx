import { FilePlus } from "lucide-react";
import { EmptyBoxScene } from "@/components/illustrations/scenes/empty-box";
import { EmptyState } from "@/components/shared/empty-state";
import { LinkButton } from "@/components/ui/button";

export function EmptyTermsState({ domainId }: { domainId: string }) {
  return (
    <EmptyState
      icon={FilePlus}
      illustration={<EmptyBoxScene className="w-44 sm:w-52" />}
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
