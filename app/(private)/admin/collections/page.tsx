import { AdminCollectionsPageClient } from "@/components/jargon/admin/admin-collections-page";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { listAllCollectionsForAdmin } from "@/lib/jargon/admin/list-all-collections";

export default async function AdminCollectionsPage() {
  const { supabase } = await requireAdminPage();

  const collections = await listAllCollectionsForAdmin(supabase);

  return <AdminCollectionsPageClient collections={collections} />;
}
