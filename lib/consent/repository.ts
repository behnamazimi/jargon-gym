import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { CONSENT_VERSION, parseConsent, type Consent, type SavedConsent } from "./consent";

type Client = SupabaseClient<Database>;

export async function saveAnalyticsConsent(client: Client, userId: string, consent: Consent) {
  const now = new Date().toISOString();
  const { error } = await client.from("user_settings").upsert(
    {
      user_id: userId,
      analytics_consent: consent,
      analytics_consent_at: now,
      analytics_consent_version: CONSENT_VERSION,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export function savedConsent(
  row: {
    analytics_consent: string | null;
    analytics_consent_at: string | null;
    analytics_consent_version: string | null;
  } | null,
): SavedConsent | null {
  const choice = parseConsent(row?.analytics_consent);
  if (!row || !choice) return null;
  return { choice, at: row.analytics_consent_at, version: row.analytics_consent_version };
}
