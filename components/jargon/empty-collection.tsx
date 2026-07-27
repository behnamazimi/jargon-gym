import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/jargon/empty-state";
import { PageShell } from "@/components/page-container";
import { LinkButton } from "@/components/ui/button";

export function EmptyCollection() {
  return (
    <PageShell innerClassName="flex min-h-[60vh] flex-col items-center justify-center">
      <EmptyState
        icon={Sparkles}
        titleAs="h1"
        title={
          <>
            <span className="text-primary">Your collection</span> is empty
          </>
        }
        description="Import your own terms as JSON, or browse collections others have shared and add them to yours."
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/jargon/import">Import jargon</LinkButton>
          <LinkButton href="/jargon/browse" variant="outline">
            Browse shared collections
          </LinkButton>
        </div>
      </EmptyState>
    </PageShell>
  );
}
