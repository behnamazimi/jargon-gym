"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";
import { writeAudit } from "@/lib/admin/audit";
import {
  statusOf,
  stepsFor,
  type CollectionStatus,
  type StatusStep,
} from "@/lib/admin/collections/collection-status";
import {
  listAllCollectionsForAdmin,
  type AdminCollectionRow,
} from "@/lib/admin/collections/list-all-collections";
import { buildPublishSlugs } from "@/lib/admin/collections/publish-slugs";
import { resolveSlug } from "@/lib/admin/collections/slug-check";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** PostgREST returns at most this many rows per request. */
const PAGE_SIZE = 1000;

/** The collection, if an admin may change it. The browser only sends an id, and the
 *  publish function bypasses row level security, so ownership is checked here. */
async function findActable(supabase: Client, adminId: string, domainId: string) {
  const collections = await listAllCollectionsForAdmin(supabase, adminId);
  const collection = collections.find((row) => row.id === domainId);
  if (!collection || collection.readOnly) throw new AdminError("Collection not found.");
  return { collection, collections };
}

function takenSlugs(collections: AdminCollectionRow[], domainId: string) {
  return new Set(collections.flatMap((row) => (row.id !== domainId && row.slug ? [row.slug] : [])));
}

/** The public pages, the public list (cached for an hour) and the sitemap. */
function revalidateCollection(slug: string | null) {
  revalidatePath("/admin/collections");
  if (slug) revalidatePath(`/collections/${slug}`, "layout");
  revalidatePath("/collections");
  revalidatePath("/sitemap.xml");
}

async function listTermsOf(supabase: Client, domainId: string) {
  const terms: { id: string; term: string; slug: string | null }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("terms")
      .select("id, term, slug")
      .eq("domain_id", domainId)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    terms.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return terms;
}

/** A slug was taken, or a term was added, between reading and publishing. Reading again fixes it. */
function shouldReadAgain(error: { code?: string }): boolean {
  return error.code === "23505" || error.code === "40001";
}

async function publishOnce(
  supabase: Client,
  collection: AdminCollectionRow,
  collections: AdminCollectionRow[],
) {
  const { domainSlug, termSlugs } = buildPublishSlugs({
    domainName: collection.name,
    domainSlug: collection.slug,
    takenDomainSlugs: takenSlugs(collections, collection.id),
    terms: await listTermsOf(supabase, collection.id),
  });

  return supabase.rpc("admin_publish_collection", {
    p_domain_id: collection.id,
    p_domain_slug: domainSlug,
    p_term_slugs: termSlugs,
  });
}

/** Publishes with what was just read; reads everything again once if that turned stale. */
async function publish(
  supabase: Client,
  adminId: string,
  first: { collection: AdminCollectionRow; collections: AdminCollectionRow[] },
): Promise<string> {
  let result = await publishOnce(supabase, first.collection, first.collections);
  if (result.error && shouldReadAgain(result.error)) {
    const again = await findActable(supabase, adminId, first.collection.id);
    result = await publishOnce(supabase, again.collection, again.collections);
  }
  if (result.error) {
    if (shouldReadAgain(result.error)) throw new AdminError("Couldn't publish. Try again.");
    throw result.error;
  }
  if (!result.data) throw new Error("Publishing returned no slug.");
  return result.data;
}

const statusSchema = z.enum(["none", "builtin", "published"]);

/** Moves a collection to a status. Where it is now comes from the database, not the browser. */
export async function setCollectionStatus(domainId: string, target: CollectionStatus) {
  return runAdminAction(async ({ supabase, user }): Promise<{ slug: string | null }> => {
    const to = statusSchema.parse(target);
    const found = await findActable(supabase, user.id, domainId);
    const from = statusOf(found.collection);
    let slug = found.collection.slug;

    const steps = stepsFor(from, to);
    let applied = 0;
    try {
      for (const step of steps) {
        if (step.kind === "publish") {
          slug = await publish(supabase, user.id, found);
        } else {
          const { error } = await supabase
            .from("domains")
            .update(step.values)
            .eq("id", domainId)
            .select("id")
            .single();
          if (error) throw error;
        }
        applied += 1;
      }
    } catch (err) {
      // The first step is already saved, so show the page as it is now and say so.
      if (applied > 0) {
        await auditStatus(supabase, domainId, from, "builtin", slug, steps);
        revalidateCollection(slug);
        throw new AdminError(
          "The collection was marked built-in, but publishing failed. Try again.",
        );
      }
      throw err;
    }

    await auditStatus(supabase, domainId, from, to, slug, steps);
    revalidateCollection(slug);
    return { slug };
  });
}

/** Publishing alone is already recorded by the database; everything else the app records. */
async function auditStatus(
  supabase: Client,
  domainId: string,
  from: CollectionStatus,
  reached: CollectionStatus,
  slug: string | null,
  steps: StatusStep[],
) {
  if (steps.length === 0 || (steps.length === 1 && steps[0]?.kind === "publish")) return;
  await writeAudit(supabase, {
    action: "app.collection_status",
    targetType: "domain",
    targetId: domainId,
    details: { from, to: reached, slug },
  });
}

const rawSlugSchema = z.string().max(300);
const expectedSchema = z.string().max(120);

/** What a typed address would become, and whether it is free. A read: nothing is saved. */
export async function checkDomainSlug(domainId: string, raw: string) {
  return runAdminAction(async ({ supabase, user }) => {
    const { collections } = await findActable(supabase, user.id, domainId);
    return resolveSlug(rawSlugSchema.parse(raw), takenSlugs(collections, domainId));
  });
}

/** Saves the address the admin checked. If it isn't that any more (someone took it, or the text
 *  changed), it says so instead of quietly saving a different one. */
export async function updateDomainSlug(domainId: string, raw: string, expected: string) {
  return runAdminAction(async ({ supabase, user }): Promise<{ slug: string }> => {
    const { collection, collections } = await findActable(supabase, user.id, domainId);
    if (!collection.isBuiltin && !collection.slug) {
      throw new AdminError("Only built-in collections have a public address.");
    }

    const checked = resolveSlug(rawSlugSchema.parse(raw), takenSlugs(collections, domainId));
    if (!checked.valid) throw new AdminError("Use letters or numbers in the address.");
    if (checked.taken) throw new AdminError("That address is taken. Check again.");
    if (checked.slug !== expectedSchema.parse(expected))
      throw new AdminError("The address changed. Check it again.");

    const { error } = await supabase
      .from("domains")
      .update({ slug: checked.slug })
      .eq("id", domainId)
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new AdminError("That address is taken. Check again.");
      throw error;
    }

    if (checked.slug !== collection.slug) {
      await writeAudit(supabase, {
        action: "app.collection_slug",
        targetType: "domain",
        targetId: domainId,
        details: { old: collection.slug, new: checked.slug },
      });
    }

    if (collection.isPublic) {
      revalidateCollection(collection.slug);
      revalidateCollection(checked.slug);
    } else {
      revalidatePath("/admin/collections");
    }
    return { slug: checked.slug };
  });
}
