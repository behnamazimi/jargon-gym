import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/jargon/empty-state";
import { PageCenter } from "@/components/page-container";
import { LinkButton } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/require-session";
import { fetchStatsSnapshot, type CollectionStatBreakdown } from "@/lib/jargon/collection-stats";

function formatBucketLine(buckets: Array<[word: string, count: number]>): string {
  const nonZero = buckets.filter(([, count]) => count > 0);
  if (nonZero.length === 0) return "None waiting";
  return nonZero.map(([word, count]) => `${count} ${word}`).join(" · ");
}

function formatUnknownFootnote(collection: CollectionStatBreakdown): string {
  const total = collection.unknownNever + collection.unknownRecent + collection.unknownStale;
  return `${total} unknown: ${collection.unknownNever} never · ${collection.unknownRecent} recent · ${collection.unknownStale} stale`;
}

function RollupRow({ label, buckets }: { label: string; buckets: Array<[string, number]> }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="font-medium text-base-content">{label}</span>
      <span className="text-base-content/60">{formatBucketLine(buckets)}</span>
    </div>
  );
}

function CollectionCard({ collection }: { collection: CollectionStatBreakdown }) {
  return (
    <div className="shadow-surface space-y-3 rounded-2xl bg-base-100 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading truncate text-base font-semibold">{collection.name}</h2>
        <span className="shrink-0 text-sm tabular-nums text-base-content/60">
          {collection.knownCount}/{collection.totalCount} known
        </span>
      </div>
      <progress
        className="progress progress-primary h-2 w-full"
        value={collection.percentage}
        max={100}
        aria-label={`${collection.name} known ${collection.percentage}%`}
      />
      <p className="text-xs text-base-content/50">{formatUnknownFootnote(collection)}</p>
    </div>
  );
}

export default async function StatPage() {
  const { supabase, user } = await getSessionUser();

  if (!user) {
    return (
      <PageCenter>
        <p className="text-sm text-base-content/60">Log in to view your stats.</p>
      </PageCenter>
    );
  }

  const stats = await fetchStatsSnapshot(supabase, user.id);

  if (stats.activeCount === 0 && stats.pausedCount === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No collections yet"
        description="Import your own terms or add a shared collection to see stats here."
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

  return (
    <div className="space-y-6">
      <div className="shadow-surface rounded-2xl bg-base-100 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-base-content/50">
          {stats.activeCount} active · {stats.pausedCount} paused
        </p>
        {stats.activeCollections.length > 0 ? (
          <div className="divide-y divide-base-content/10">
            <RollupRow
              label="Read"
              buckets={[
                ["never", stats.rollup.read.never],
                ["stale", stats.rollup.read.stale],
              ]}
            />
            <RollupRow
              label="Review"
              buckets={[
                ["never", stats.rollup.review.never],
                ["struggling", stats.rollup.review.struggling],
              ]}
            />
            <RollupRow
              label="Quiz"
              buckets={[
                ["never", stats.rollup.quiz.never],
                ["struggling", stats.rollup.quiz.struggling],
              ]}
            />
          </div>
        ) : null}
      </div>

      {stats.activeCollections.length > 0 ? (
        <div className="space-y-3">
          {stats.activeCollections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-base-content/60">
          All collections are paused. Turn one on in the app to start reviewing.
        </p>
      )}
    </div>
  );
}
