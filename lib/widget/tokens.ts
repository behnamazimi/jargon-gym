import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { WidgetTokenRow } from "./types";

type Client = SupabaseClient<Database>;

function generateWidgetTokenValue(): string {
  return randomBytes(32).toString("base64url");
}

function hashWidgetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createWidgetToken(
  client: Client,
  userId: string,
  label = "Übersicht widget",
): Promise<{ id: string; token: string }> {
  const token = generateWidgetTokenValue();
  const tokenHash = hashWidgetToken(token);

  const { data, error } = await client
    .from("widget_tokens")
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      label,
    })
    .select("id")
    .single();

  if (error) throw error;

  return { id: data.id, token };
}

export async function revokeWidgetToken(client: Client, userId: string, tokenId: string) {
  const { error } = await client
    .from("widget_tokens")
    .delete()
    .eq("id", tokenId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function listWidgetTokens(client: Client, userId: string): Promise<WidgetTokenRow[]> {
  const { data, error } = await client
    .from("widget_tokens")
    .select("id, label, created_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function resolveUserFromToken(
  client: Client,
  bearerToken: string,
): Promise<string | null> {
  const tokenHash = hashWidgetToken(bearerToken);

  const { data, error } = await client
    .from("widget_tokens")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  await client
    .from("widget_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return data.user_id;
}
