import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSection } from "@/components/admin/admin-section";
import { AdminStat } from "@/components/admin/admin-stat";
import { CollectionDetailControls } from "@/components/admin/collections/detail-controls";
import {
  ModerationActions,
  ModerationBadges,
} from "@/components/admin/collections/moderation-cell";
import { ClipList, parseClipFilter } from "@/components/admin/collections/narration/clip-list";
import { NarrationModeSelect } from "@/components/admin/collections/narration/mode-select";
import { NarrationSyncPanel } from "@/components/admin/collections/narration/sync-panel";
import {
  canNarrateCollection,
  listAllCollectionsForAdmin,
} from "@/lib/admin/collections/list-all-collections";
import { first, isUuid, PAGE_SIZE, type RawParams } from "@/lib/admin/list-params";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { isNarrationEnabled } from "@/lib/narration/feature";
import { getNarrationMode } from "@/lib/narration/mode";
import {
  getCollectionNarrationCoverage,
  getLastNarrationSyncJob,
  listCollectionTermClips,
} from "@/lib/narration/sync";
import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawParams>;
};

export default async function AdminCollectionPage({ params, searchParams }: PageProps) {
  const { supabase, user } = await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const collection = (await listAllCollectionsForAdmin(supabase, user.id)).find(
    (row) => row.id === id,
  );
  if (!collection) notFound();

  const raw = await searchParams;
  const filter = parseClipFilter(first(raw.clips));
  const pageNumber = Number.parseInt(first(raw.page) ?? "", 10);
  const page = Number.isFinite(pageNumber) && pageNumber > 0 ? Math.min(pageNumber, 100_000) : 1;

  const narratable = canNarrateCollection(collection);
  const admin = createAdminClient();
  const narration = narratable
    ? await Promise.all([
        getNarrationMode(supabase, id),
        getCollectionNarrationCoverage(admin, id),
        listCollectionTermClips(admin, id, {
          page,
          pageSize: PAGE_SIZE,
          state: filter === "all" ? "all" : filter,
        }),
        getLastNarrationSyncJob(admin),
        isNarrationEnabled(admin),
      ])
    : null;

  return (
    <>
      <Link href="/admin/collections" className="link text-sm">
        ← Collections
      </Link>
      <AdminPageHeader
        title={collection.name}
        description={`${collection.termCount} ${collection.termCount === 1 ? "term" : "terms"} · ${collection.ownerEmail ?? "no owner email"}${collection.readOnly ? " · Someone else's collection, so it can't be changed." : ""}`}
        actions={<ModerationBadges collection={collection} />}
      />

      <AdminSection id="details" title="Details">
        <CollectionDetailControls collection={collection} />
      </AdminSection>

      <AdminSection
        id="sharing"
        title="Sharing and reports"
        description={
          collection.visibility === "shared"
            ? `Shared with members · ${collection.loveCount} loves`
            : "Private to its owner."
        }
      >
        <ModerationActions collection={collection} />
      </AdminSection>

      {narration ? (
        <AdminSection
          id="narration"
          title="Narration"
          description="Term only speaks just the name. Full speaks the term, its definition and the details. Changing the mode makes this collection's clips stale until you make new ones."
        >
          <NarrationModeSelect domainId={id} name={collection.name} mode={narration[0]} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AdminStat label="Terms with a definition" value={narration[1].total} />
            <AdminStat label="Clips ready" value={narration[1].current} />
            <AdminStat label="Stale" value={narration[1].stale} />
            <AdminStat label="Missing" value={narration[1].missing} />
          </div>

          <NarrationSyncPanel
            domainId={id}
            narrationEnabled={narration[4]}
            needsAudioCount={narration[1].stale + narration[1].missing}
            lastJob={narration[3]}
          />

          <ClipList
            domainId={id}
            clips={narration[2].clips}
            total={narration[2].total}
            filter={filter}
            page={page}
          />
        </AdminSection>
      ) : null}
    </>
  );
}
