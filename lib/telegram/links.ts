import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { TELEGRAM_LINK_TOKEN_CONTRACT } from "./link-token-contract";
import type { TelegramCadence, TelegramLinkStatus } from "./types";

type Client = SupabaseClient<Database>;

/** @see TELEGRAM_LINK_TOKEN_CONTRACT — Node adapter for token generation. */
function generateLinkTokenValue(): string {
  return randomBytes(TELEGRAM_LINK_TOKEN_CONTRACT.tokenBytes).toString(
    TELEGRAM_LINK_TOKEN_CONTRACT.tokenEncoding,
  );
}

/** @see TELEGRAM_LINK_TOKEN_CONTRACT — Node adapter (crypto.createHash). */
function hashLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function buildTelegramDeepLink(token: string): string {
  const username = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  if (!username) {
    throw new Error("Missing TELEGRAM_BOT_USERNAME.");
  }
  return `https://t.me/${username}?start=${encodeURIComponent(token)}`;
}

export async function getTelegramLinkStatus(
  client: Client,
  userId: string,
): Promise<TelegramLinkStatus> {
  const { data, error } = await client
    .from("telegram_links")
    .select("chat_id, cadence, linked_at, link_token_hash, link_token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      connected: false,
      cadence: "off",
      linkedAt: null,
      hasPendingLink: false,
    };
  }

  const hasPendingLink =
    data.link_token_hash !== null &&
    data.link_token_expires_at !== null &&
    new Date(data.link_token_expires_at).getTime() > Date.now();

  return {
    connected: data.chat_id !== null,
    cadence: data.cadence,
    linkedAt: data.linked_at,
    hasPendingLink,
  };
}

export async function createOrRefreshTelegramLink(
  client: Client,
  userId: string,
): Promise<{ token: string; deepLink: string }> {
  const token = generateLinkTokenValue();
  const tokenHash = hashLinkToken(token);
  const expiresAt = new Date(Date.now() + TELEGRAM_LINK_TOKEN_CONTRACT.ttlMs).toISOString();

  const { error } = await client.from("telegram_links").upsert(
    {
      user_id: userId,
      link_token_hash: tokenHash,
      link_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;

  return { token, deepLink: buildTelegramDeepLink(token) };
}

export async function disconnectTelegram(client: Client, userId: string) {
  const { error } = await client.from("telegram_links").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function updateTelegramCadence(client: Client, cadence: TelegramCadence) {
  const { error } = await client.rpc("update_telegram_cadence", {
    p_cadence: cadence,
  });

  if (error) throw error;
}
