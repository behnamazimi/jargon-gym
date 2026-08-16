"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";
import { generateUniqueSlug, slugify } from "@/lib/jargon/slug";

async function requireAdminClient() {
  const { supabase, user } = await getSessionUser();
  if (!user || !(await getUserIsAdmin(user.id))) {
    throw new Error("Admins only.");
  }
  return supabase;
}

export async function setBuiltin(domainId: string, value: boolean) {
  const supabase = await requireAdminClient();

  const update: { is_builtin: boolean; is_public?: boolean } = { is_builtin: value };
  if (!value) update.is_public = false;

  const { error } = await supabase.from("domains").update(update).eq("id", domainId);
  if (error) throw error;

  revalidatePath("/admin/collections");
}

export async function setPublic(
  domainId: string,
  value: boolean,
): Promise<{ slug: string | null }> {
  const supabase = await requireAdminClient();

  const { data: domain, error: fetchError } = await supabase
    .from("domains")
    .select("id, name, slug, is_builtin")
    .eq("id", domainId)
    .single();
  if (fetchError) throw fetchError;
  if (value && !domain.is_builtin) {
    throw new Error("Only built-in collections can be made public.");
  }

  let slug = domain.slug;

  if (value && !slug) {
    const { data: existingDomains, error: slugError } = await supabase
      .from("domains")
      .select("slug")
      .not("slug", "is", null);
    if (slugError) throw slugError;

    const existingSlugs = new Set((existingDomains ?? []).map((row) => row.slug!));
    slug = generateUniqueSlug(domain.name, existingSlugs);

    const { error: updateError } = await supabase
      .from("domains")
      .update({ slug })
      .eq("id", domainId);
    if (updateError) throw updateError;
  }

  if (value) {
    await ensureTermSlugs(supabase, domainId);
  }

  const { error } = await supabase.from("domains").update({ is_public: value }).eq("id", domainId);
  if (error) throw error;

  if (slug) {
    revalidatePath(`/t/${slug}`, "layout");
  }
  revalidatePath("/admin/collections");
  revalidatePath("/sitemap.xml");

  return { slug };
}

export async function updateDomainSlug(
  domainId: string,
  rawSlug: string,
): Promise<{ slug: string }> {
  const supabase = await requireAdminClient();

  const { data: existingDomains, error: slugError } = await supabase
    .from("domains")
    .select("slug")
    .not("slug", "is", null)
    .neq("id", domainId);
  if (slugError) throw slugError;

  const existingSlugs = new Set((existingDomains ?? []).map((row) => row.slug!));
  const slug = generateUniqueSlug(slugify(rawSlug), existingSlugs);

  const { error } = await supabase.from("domains").update({ slug }).eq("id", domainId);
  if (error) throw error;

  revalidatePath("/admin/collections");
  revalidatePath("/sitemap.xml");

  return { slug };
}

type AdminClient = Awaited<ReturnType<typeof requireAdminClient>>;

async function ensureTermSlugs(supabase: AdminClient, domainId: string) {
  const { data: terms, error } = await supabase
    .from("terms")
    .select("id, term, slug")
    .eq("domain_id", domainId);
  if (error) throw error;

  const existingSlugs = new Set(
    (terms ?? []).filter((term) => term.slug).map((term) => term.slug!),
  );

  for (const term of terms ?? []) {
    if (term.slug) continue;
    const slug = generateUniqueSlug(term.term, existingSlugs);
    existingSlugs.add(slug);

    const { error: updateError } = await supabase.from("terms").update({ slug }).eq("id", term.id);
    if (updateError) throw updateError;
  }
}
