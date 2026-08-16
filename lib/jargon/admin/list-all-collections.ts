import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type AdminCollectionRow = {
  id: string;
  name: string;
  ownerEmail: string | null;
  termCount: number;
  isBuiltin: boolean;
  isPublic: boolean;
  slug: string | null;
};

export async function listAllCollectionsForAdmin(client: Client): Promise<AdminCollectionRow[]> {
  const { data: domains, error } = await client
    .from("domains")
    .select("id, name, owner_id, is_builtin, is_public, slug, users!domains_owner_id_fkey(email)")
    .order("name");

  if (error) throw error;
  if (!domains?.length) return [];

  const { data: terms, error: termsError } = await client.from("terms").select("domain_id");

  if (termsError) throw termsError;

  const termCountByDomain = new Map<string, number>();
  for (const row of terms ?? []) {
    termCountByDomain.set(row.domain_id, (termCountByDomain.get(row.domain_id) ?? 0) + 1);
  }

  return domains.map((domain) => ({
    id: domain.id,
    name: domain.name,
    ownerEmail: domain.users?.email ?? null,
    termCount: termCountByDomain.get(domain.id) ?? 0,
    isBuiltin: domain.is_builtin,
    isPublic: domain.is_public,
    slug: domain.slug,
  }));
}
