import { AdminCollectionsPageClient } from "@/components/jargon/admin/admin-collections-page";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { listAllCollectionsForAdmin } from "@/lib/jargon/admin/list-all-collections";

export default async function AdminCollectionsPage() {
  const { supabase, user } = await requireAdminPage();

  const collections = await listAllCollectionsForAdmin(supabase, user.id);

  return <AdminCollectionsPageClient collections={collections} />;
}
