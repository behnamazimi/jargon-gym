"use server";

import { createClient } from "@/lib/supabase/server";
import { upsertTermKnown } from "@/lib/jargon/queries";

export async function setTermKnown(
  termId: string,
  isKnown: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in to update progress." };
  }

  try {
    await upsertTermKnown(supabase, user.id, termId, isKnown);
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update progress.";
    return { error: message };
  }
}
