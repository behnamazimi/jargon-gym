import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/jargon/empty-state";
import { PageShell } from "@/components/page-container";
import { StartCollectionButton } from "@/components/jargon/start-collection-button";
import { LinkButton } from "@/components/ui/button";

export function EmptyCollection() {
  return (
    <PageShell innerClassName="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <EmptyState
        icon={Sparkles}
        titleAs="h1"
        title={
          <>
            <span className="text-primary-text">Your collection</span> is empty
          </>
        }
        description="Add a collection others have shared in one tap, or start your own."
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/jargon/browse" data-tour="library-browse">
            Browse shared collections
          </LinkButton>
          <LinkButton href="/jargon/import" variant="outline" data-tour="library-import">
            Add your own terms
          </LinkButton>
          <StartCollectionButton />
        </div>
      </EmptyState>
    </PageShell>
  );
}
