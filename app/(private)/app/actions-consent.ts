"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { parseConsent } from "@/lib/consent/consent";
import { saveAnalyticsConsent } from "@/lib/consent/repository";

/** Records a signed-in member's analytics choice. Signed-out visitors keep only the cookie. */
export async function saveAnalyticsConsentAction(choice: string): Promise<{ error?: string }> {
  const consent = parseConsent(choice);
  if (!consent) return { error: "Unknown choice." };

  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await saveAnalyticsConsent(auth.supabase, auth.user.id, consent);
    return {};
  } catch (err) {
    console.error("saveAnalyticsConsentAction failed:", err);
    return { error: "Couldn't save your choice." };
  }
}
