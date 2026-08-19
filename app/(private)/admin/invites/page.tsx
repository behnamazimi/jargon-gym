import { notFound } from "next/navigation";
import { AdminInvitesPageClient } from "@/components/jargon/admin/admin-invites-page";
import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";
import { listWaitlistRequestsForAdmin } from "@/lib/jargon/admin/list-waitlist-requests";

export default async function AdminInvitesPage() {
  const { supabase, user } = await getSessionUser();
  if (!user || !(await getUserIsAdmin(user.id))) {
    notFound();
  }

  const requests = await listWaitlistRequestsForAdmin(supabase);

  return <AdminInvitesPageClient requests={requests} />;
}
