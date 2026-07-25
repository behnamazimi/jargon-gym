"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createWidgetToken, listWidgetTokens, revokeWidgetToken } from "@/lib/widget/tokens";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "You must be logged in." as const };
  }

  return { supabase, user };
}

export async function loadWidgetTokens() {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) return { error: auth.error, tokens: [] };

  try {
    const tokens = await listWidgetTokens(auth.supabase, auth.user.id);
    return { tokens };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load widget tokens.";
    return { error: message, tokens: [] };
  }
}

export async function generateWidgetTokenAction(): Promise<{
  error?: string;
  token?: string;
  id?: string;
}> {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) return { error: auth.error };

  try {
    const admin = createAdminClient();
    const result = await createWidgetToken(admin, auth.user.id);
    revalidatePath("/jargon/settings");
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate token.";
    return { error: message };
  }
}

export async function revokeWidgetTokenAction(tokenId: string): Promise<{ error?: string }> {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) return { error: auth.error };

  try {
    const admin = createAdminClient();
    await revokeWidgetToken(admin, auth.user.id, tokenId);
    revalidatePath("/jargon/settings");
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revoke token.";
    return { error: message };
  }
}
