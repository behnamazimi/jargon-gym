import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isReportReason, type ReportReason } from "@/lib/collections/moderation";
import { parseKind, type CollectionKind } from "@/lib/terms/kinds";

type Client = SupabaseClient<Database>;

export type AdminCollectionRow = {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string | null;
  termCount: number;
  isBuiltin: boolean;
  isPublic: boolean;
  kind: CollectionKind;
  slug: string | null;
  visibility: "private" | "shared";
  updatedAt: string;
  loveCount: number;
  openReportCount: number;
  shareBlockedAt: string | null;
  shareBlockReason: ReportReason | null;
  /** Someone else's private collection: an admin can see it exists, not change it. */
  readOnly: boolean;
};

/** Admins act on shared collections and their own. Other people's private ones are theirs alone,
 *  except after a takedown: the collection is private again, and the admin can lift its lock. */
export function canActOnCollection(
  collection: {
    visibility: string;
    ownerId: string;
    shareBlockedAt?: string | null;
  },
  adminId: string,
): boolean {
  return (
    collection.visibility === "shared" ||
    collection.ownerId === adminId ||
    Boolean(collection.shareBlockedAt)
  );
}

/** Narration is generated for whatever it is asked about, so it also covers public collections
 *  (which anyone can read), but never someone else's private, unpublished one. */
export function canNarrateCollection(collection: {
  readOnly: boolean;
  isPublic: boolean;
}): boolean {
  return !collection.readOnly || collection.isPublic;
}

/** Every collection, including other people's private ones: the table's row
 *  level security hides those from an admin's own session, so this reads
 *  through a function. */
export async function listAllCollectionsForAdmin(
  client: Client,
  adminId: string,
): Promise<AdminCollectionRow[]> {
  const { data, error } = await client.rpc("admin_list_collections");
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    // The generated types treat these two as never null; the join and the column can be.
    ownerEmail: (row.owner_email as string | null) ?? null,
    termCount: Number(row.term_count),
    isBuiltin: row.is_builtin,
    isPublic: row.is_public,
    kind: parseKind(row.kind),
    slug: (row.slug as string | null) || null,
    visibility: row.visibility,
    updatedAt: row.updated_at,
    loveCount: row.love_count,
    openReportCount: Number(row.open_report_count),
    shareBlockedAt: (row.share_blocked_at as string | null) ?? null,
    shareBlockReason: isReportReason(row.share_block_reason) ? row.share_block_reason : null,
    readOnly: !canActOnCollection(
      {
        visibility: row.visibility,
        ownerId: row.owner_id,
        shareBlockedAt: row.share_blocked_at as string | null,
      },
      adminId,
    ),
  }));
}
