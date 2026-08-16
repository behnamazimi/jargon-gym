import { Signal } from "lucide-react";
import { MasteryPage } from "@/components/jargon/mastery/mastery-page";
import { EmptyState } from "@/components/jargon/empty-state";
import { PageCenter } from "@/components/page-container";
import { LinkButton } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/require-session";
import { fetchStatsSnapshot } from "@/lib/jargon/collection-stats";
import { loadMasteryOverview } from "@/lib/jargon/mastery";

export default async function JargonMasteryPage() {
  const { supabase, user } = await getSessionUser();

  if (!user) {
    return (
      <PageCenter>
        <p className="text-sm text-base-content/60">Log in to view your mastery overview.</p>
      </PageCenter>
    );
  }

  const [{ rows, collections }, stats] = await Promise.all([
    loadMasteryOverview(supabase, user.id),
    fetchStatsSnapshot(supabase, user.id),
  ]);

  if (stats.activeCount === 0 && stats.pausedCount === 0) {
    return (
      <EmptyState
        icon={Signal}
        title="No collections yet"
        description="Import your own terms or add a shared collection to see your mastery overview here."
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/jargon/import">Import jargon</LinkButton>
          <LinkButton href="/jargon/browse" variant="outline">
            Browse shared collections
          </LinkButton>
        </div>
      </EmptyState>
    );
  }

  return <MasteryPage rows={rows} collections={collections} stats={stats} />;
}
