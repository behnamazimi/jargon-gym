import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { decryptApiKey, encryptApiKey, maskApiKeyLast4 } from "./encryption";
import type { LlmProvider, UserSettings } from "./types";

type Client = SupabaseClient<Database>;

function mapRow(row: { provider: string | null; api_key_last4: string | null }): UserSettings {
  return {
    provider: (row.provider as LlmProvider | null) ?? null,
    apiKeyLast4: row.api_key_last4,
  };
}

export async function getUserSettings(
  client: Client,
  userId: string,
): Promise<UserSettings | null> {
  const { data, error } = await client
    .from("user_settings")
    .select("provider, api_key_last4")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapRow(data);
}

export async function getDecryptedApiKey(
  client: Client,
  userId: string,
): Promise<{ provider: LlmProvider; apiKey: string } | null> {
  const { data, error } = await client
    .from("user_settings")
    .select("provider, api_key_encrypted")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.provider || !data.api_key_encrypted) return null;

  return {
    provider: data.provider as LlmProvider,
    apiKey: decryptApiKey(data.api_key_encrypted),
  };
}

export async function saveLlmSettings(
  client: Client,
  userId: string,
  input: { provider: LlmProvider; apiKey: string },
) {
  const trimmedKey = input.apiKey.trim();
  if (!trimmedKey) {
    throw new Error("API key is required.");
  }

  const { error } = await client.from("user_settings").upsert(
    {
      user_id: userId,
      provider: input.provider,
      api_key_encrypted: encryptApiKey(trimmedKey),
      api_key_last4: maskApiKeyLast4(trimmedKey),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}

export async function clearLlmSettings(client: Client, userId: string) {
  // Keep the settings row; only clear LLM credentials.
  const { error } = await client
    .from("user_settings")
    .update({
      provider: null,
      api_key_encrypted: null,
      api_key_last4: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw error;
}
