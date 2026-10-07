import { Sparkles } from "lucide-react";
import { EmptyBoxScene } from "@/components/illustrations/scenes/empty-box";
import { EmptyState } from "@/components/shared/empty-state";
import { PageShell } from "@/components/page-container";
import { StartCollectionButton } from "@/components/library/start-collection-button";
import { LinkButton } from "@/components/ui/button";

export function EmptyCollection() {
  return (
    <PageShell innerClassName="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <EmptyState
        icon={Sparkles}
        illustration={<EmptyBoxScene className="w-56 sm:w-64" />}
        titleAs="h1"
        title={
          <>
            <span className="text-primary-text">Your library</span> is empty
          </>
        }
        description="Add a collection others have shared in one tap, or start your own."
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/app/browse" data-tour="library-browse">
            Browse collections
          </LinkButton>
          <LinkButton href="/app/import" variant="outline" data-tour="library-import">
            Add your own terms
          </LinkButton>
          <StartCollectionButton />
        </div>
      </EmptyState>
    </PageShell>
  );
}
