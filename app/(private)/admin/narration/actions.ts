"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/auth/require-session";

export async function setNarrationEnabled(value: boolean): Promise<void> {
  const { supabase } = await requireAdminClient();

  const { error } = await supabase
    .from("narration_settings")
    .update({ enabled: value })
    .eq("id", true);
  if (error) throw error;

  revalidatePath("/admin/narration");
}

export async function addToNarrationAllowlist(
  email: string,
): Promise<{ userId: string; email: string }> {
  const { supabase, user } = await requireAdminClient();

  const { data: account, error: lookupError } = await supabase
    .from("users")
    .select("id, email")
    .ilike("email", email.trim())
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!account) throw new Error("No account found for that email.");

  const { error } = await supabase
    .from("narration_allowlist")
    .upsert({ user_id: account.id, added_by: user.id }, { onConflict: "user_id" });
  if (error) throw error;

  revalidatePath("/admin/narration");
  return { userId: account.id, email: account.email };
}

export async function removeFromNarrationAllowlist(userId: string): Promise<void> {
  const { supabase } = await requireAdminClient();

  const { error } = await supabase.from("narration_allowlist").delete().eq("user_id", userId);
  if (error) throw error;

  revalidatePath("/admin/narration");
}
