import { AdminInvitesPageClient } from "@/components/jargon/admin/admin-invites-page";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { listWaitlistRequestsForAdmin } from "@/lib/jargon/admin/list-waitlist-requests";

export default async function AdminInvitesPage() {
  const { supabase } = await requireAdminPage();

  const requests = await listWaitlistRequestsForAdmin(supabase);

  return <AdminInvitesPageClient requests={requests} />;
}
