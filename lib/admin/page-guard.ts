import { notFound } from "next/navigation";
import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";

/** For admin pages and the admin layout. Layouts don't re-render on client
 *  navigation, so every page calls this itself instead of relying on the layout.
 *  Server actions use `requireAdminClient`. */
export async function requireAdminPage() {
  const { supabase, user } = await getSessionUser();
  if (!user || !(await getUserIsAdmin(user.id))) {
    notFound();
  }
  return { supabase, user };
}
