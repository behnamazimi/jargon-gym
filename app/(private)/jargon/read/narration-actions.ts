"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { getOrGenerateNarration } from "@/lib/narration/service";
import type { NarrationResult } from "@/lib/narration/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getTermNarrationAction(termId: string): Promise<NarrationResult> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { status: "unavailable" };

  const { data: allowed } = await auth.supabase.rpc("has_narration_access", {
    p_user_id: auth.user.id,
  });
  if (!allowed) return { status: "unavailable" };

  return getOrGenerateNarration(createAdminClient(), termId);
}
