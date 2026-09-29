import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeatureId } from "./registry";
import { isSchemaMissing } from "./schema-missing";

type Client = SupabaseClient<Database>;

export type GuardedOutcome<T> = { busy: true } | { busy: false; value: T };

/** A little longer than the 60 s request limit, so a killed request frees
 *  itself soon after the platform gives up on it. */
const RUN_TTL_SECONDS = 70;

/** Allows one running request per user and feature. If the database doesn't
 *  have the guard yet (an app deployed ahead of its migration), the request
 *  runs unguarded. Any other guard error fails the request. */
export async function withRunGuard<T>(
  input: { admin: Client; userId: string; feature: FeatureId },
  run: () => Promise<T>,
): Promise<GuardedOutcome<T>> {
  const { admin, userId, feature } = input;
  const { data: token, error } = await admin.rpc("begin_ai_run", {
    p_user_id: userId,
    p_feature: feature,
    p_ttl_seconds: RUN_TTL_SECONDS,
  });

  if (error) {
    if (!isSchemaMissing(error)) throw error;
    console.error("The AI run guard isn't in the database yet:", error);
    return { busy: false, value: await run() };
  }
  if (!token) return { busy: true };

  try {
    return { busy: false, value: await run() };
  } finally {
    const { error: endError } = await admin.rpc("end_ai_run", {
      p_user_id: userId,
      p_feature: feature,
      p_token: token,
    });
    if (endError) console.error("Couldn't release the AI run guard:", endError);
  }
}
