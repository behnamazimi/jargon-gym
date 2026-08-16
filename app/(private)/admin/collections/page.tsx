import { notFound } from "next/navigation";
import { AdminCollectionsPageClient } from "@/components/jargon/admin/admin-collections-page";
import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";
import { listAllCollectionsForAdmin } from "@/lib/jargon/admin/list-all-collections";

export default async function AdminCollectionsPage() {
  const { supabase, user } = await getSessionUser();
  if (!user || !(await getUserIsAdmin(user.id))) {
    notFound();
  }

  const collections = await listAllCollectionsForAdmin(supabase);

  return <AdminCollectionsPageClient collections={collections} />;
}
