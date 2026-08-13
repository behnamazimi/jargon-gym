import { ImportPageClient } from "@/components/jargon/import/import-page";
import { getSessionUser } from "@/lib/auth/require-session";
import { listOwnedCollectionsForImport } from "@/lib/jargon/import/owned-collections";

export default async function ImportPage() {
  const { supabase, user } = await getSessionUser();
  const collections = user ? await listOwnedCollectionsForImport(supabase, user.id) : [];

  return <ImportPageClient collections={collections} />;
}
