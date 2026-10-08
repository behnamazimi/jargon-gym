"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import type { Database } from "@/lib/supabase/database.types";
import { addNotYetTerms, clearNotYetCollection, removeNotYetTerm } from "@/lib/triage/repository";

async function runNotYetWrite(
  write: (client: SupabaseClient<Database>) => Promise<void>,
): Promise<{ error?: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: auth.error };

  try {
    await write(auth.supabase);
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't save that. Try again.";
    return { error: message };
  }
}

export async function addNotYetTermsAction(termIds: string[]) {
  return runNotYetWrite((client) => addNotYetTerms(client, termIds));
}

export async function removeNotYetTermAction(termId: string) {
  return runNotYetWrite((client) => removeNotYetTerm(client, termId));
}

export async function clearNotYetCollectionAction(collectionId: string) {
  return runNotYetWrite((client) => clearNotYetCollection(client, collectionId));
}
