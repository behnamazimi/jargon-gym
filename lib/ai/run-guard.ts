import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeatureId } from "./registry";

type Client = SupabaseClient<Database>;

export type GuardedOutcome<T> = { busy: true } | { busy: false; value: T };

/** A little longer than the 60 s request limit, so a killed request frees
 *  itself soon after the platform gives up on it. */
const RUN_TTL_SECONDS = 70;

/** Allows one running request per user and feature. If the guard itself can't
 *  be reached (for example the database is mid-deploy), the request runs
 *  unguarded rather than failing for everyone. */
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
    console.error("Couldn't start the AI run guard:", error);
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
