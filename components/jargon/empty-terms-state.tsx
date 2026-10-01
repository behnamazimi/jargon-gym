import { FilePlus } from "lucide-react";
import { EmptyState } from "@/components/jargon/empty-state";
import { Button, LinkButton } from "@/components/ui/button";

export function EmptyTermsState({ onAddTerm }: { onAddTerm: () => void }) {
  return (
    <EmptyState
      icon={FilePlus}
      title="No terms yet"
      description="Add your first term, or import a list."
      className="py-10"
    >
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onPress={onAddTerm}>
          Add a term
        </Button>
        <LinkButton href="/jargon/import" variant="outline">
          Import terms
        </LinkButton>
      </div>
    </EmptyState>
  );
}
