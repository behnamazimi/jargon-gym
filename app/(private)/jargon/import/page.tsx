import { ImportPageClient } from "@/components/jargon/import/import-page";
import { listOwnedCollectionsForImport } from "@/lib/jargon/import/owned-collections";
import { createClient } from "@/lib/supabase/server";

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const collections = user ? await listOwnedCollectionsForImport(supabase, user.id) : [];

  return <ImportPageClient collections={collections} />;
}
