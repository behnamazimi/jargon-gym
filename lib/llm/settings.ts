import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { decryptApiKey, encryptApiKey, maskApiKeyLast4 } from "./encryption";
import type { LlmProvider, UserLlmSettings } from "./types";

type Client = SupabaseClient<Database>;

function mapRow(row: {
  provider: string;
  api_key_last4: string;
  mark_unknown_on_fail: boolean;
  mark_known_on_pass: boolean;
}): UserLlmSettings {
  return {
    provider: row.provider as LlmProvider,
    apiKeyLast4: row.api_key_last4,
    markUnknownOnFail: row.mark_unknown_on_fail,
    markKnownOnPass: row.mark_known_on_pass,
  };
}

export async function getUserLlmSettings(
  client: Client,
  userId: string,
): Promise<UserLlmSettings | null> {
  const { data, error } = await client
    .from("user_llm_settings")
    .select("provider, api_key_last4, mark_unknown_on_fail, mark_known_on_pass")
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
    .from("user_llm_settings")
    .select("provider, api_key_encrypted")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    provider: data.provider as LlmProvider,
    apiKey: decryptApiKey(data.api_key_encrypted),
  };
}

export async function saveUserLlmSettings(
  client: Client,
  userId: string,
  input: { provider: LlmProvider; apiKey: string },
) {
  const trimmedKey = input.apiKey.trim();
  if (!trimmedKey) {
    throw new Error("API key is required.");
  }

  const { error } = await client.from("user_llm_settings").upsert(
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

export async function updateQuizPreferences(
  client: Client,
  userId: string,
  input: { markUnknownOnFail: boolean; markKnownOnPass: boolean },
) {
  const { error } = await client
    .from("user_llm_settings")
    .update({
      mark_unknown_on_fail: input.markUnknownOnFail,
      mark_known_on_pass: input.markKnownOnPass,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw error;
}

export async function clearUserLlmSettings(client: Client, userId: string) {
  const { error } = await client.from("user_llm_settings").delete().eq("user_id", userId);

  if (error) throw error;
}
