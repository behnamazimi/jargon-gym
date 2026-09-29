"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";
import {
  listAllCollectionsForAdmin,
  type AdminCollectionRow,
} from "@/lib/jargon/admin/list-all-collections";
import { buildPublishSlugs } from "@/lib/jargon/admin/publish-slugs";
import { generateUniqueSlug, slugify } from "@/lib/jargon/slug";
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

function revalidateCollection(slug: string | null) {
  revalidatePath("/admin/collections");
  if (slug) revalidatePath(`/j/${slug}`, "layout");
  revalidatePath("/sitemap.xml");
}

export async function setBuiltin(domainId: string, value: boolean) {
  return runAdminAction(async ({ supabase, user }) => {
    await findActable(supabase, user.id, domainId);

    const update: { is_builtin: boolean; is_public?: boolean } = { is_builtin: value };
    if (!value) update.is_public = false;

    const { data: domain, error } = await supabase
      .from("domains")
      .update(update)
      .eq("id", domainId)
      .select("slug")
      .single();
    if (error) throw error;

    revalidatePath("/admin/collections");
    if (!value && domain.slug) {
      revalidatePath(`/j/${domain.slug}`, "layout");
      revalidatePath("/sitemap.xml");
    }
  });
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

async function publishOnce(supabase: Client, adminId: string, domainId: string) {
  const { collection, collections } = await findActable(supabase, adminId, domainId);
  if (!collection.isBuiltin) {
    throw new AdminError("Only built-in collections can be made public.");
  }

  const { domainSlug, termSlugs } = buildPublishSlugs({
    domainName: collection.name,
    domainSlug: collection.slug,
    takenDomainSlugs: new Set(
      collections.flatMap((row) => (row.id !== domainId && row.slug ? [row.slug] : [])),
    ),
    terms: await listTermsOf(supabase, domainId),
  });

  return supabase.rpc("admin_publish_collection", {
    p_domain_id: domainId,
    p_domain_slug: domainSlug,
    p_term_slugs: termSlugs,
  });
}

async function publish(supabase: Client, adminId: string, domainId: string): Promise<string> {
  let result = await publishOnce(supabase, adminId, domainId);
  if (result.error && shouldReadAgain(result.error)) {
    result = await publishOnce(supabase, adminId, domainId);
  }
  if (result.error) {
    if (shouldReadAgain(result.error)) throw new AdminError("Couldn't publish. Try again.");
    throw result.error;
  }
  if (!result.data) throw new Error("Publishing returned no slug.");
  return result.data;
}

export async function setPublic(domainId: string, value: boolean) {
  return runAdminAction(async ({ supabase, user }): Promise<{ slug: string | null }> => {
    let slug: string | null;
    if (value) {
      slug = await publish(supabase, user.id, domainId);
    } else {
      await findActable(supabase, user.id, domainId);
      const { data, error } = await supabase
        .from("domains")
        .update({ is_public: false })
        .eq("id", domainId)
        .select("slug")
        .single();
      if (error) throw error;
      slug = data.slug;
    }

    revalidateCollection(slug);
    return { slug };
  });
}

function takenSlugs(collections: AdminCollectionRow[], domainId: string) {
  return new Set(collections.flatMap((row) => (row.id !== domainId && row.slug ? [row.slug] : [])));
}

export async function updateDomainSlug(domainId: string, rawSlug: string) {
  return runAdminAction(async ({ supabase, user }): Promise<{ slug: string }> => {
    const { collection, collections } = await findActable(supabase, user.id, domainId);
    const slug = generateUniqueSlug(slugify(rawSlug), takenSlugs(collections, domainId));

    const { error } = await supabase
      .from("domains")
      .update({ slug })
      .eq("id", domainId)
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new AdminError("That slug is taken. Try another.");
      throw error;
    }

    if (collection.isPublic) revalidateCollection(collection.slug);
    revalidateCollection(slug);
    return { slug };
  });
}
