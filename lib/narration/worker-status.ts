import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

const WORKER = "narration-sync";

/** The cron job should tick every minute; this much silence is a problem. */
const CRON_SILENT_MS = 5 * 60 * 1000;

/** Records that the worker was called, and which secret was used. Best effort:
 *  a failure is logged and never fails the tick. */
export async function recordWorkerTick(
  admin: Client,
  tick: { source: "cron" | "app"; secret: "ai" | "legacy" },
): Promise<void> {
  try {
    const { error } = await admin.from("ai_worker_status").upsert(
      {
        worker: WORKER,
        source: tick.source,
        last_secret: tick.secret,
        last_tick_at: new Date().toISOString(),
      },
      { onConflict: "worker,source" },
    );
    if (error) console.error("Couldn't record the worker tick:", error);
  } catch (error) {
    console.error("Couldn't record the worker tick:", error);
  }
}

export type CronStatus = { lastTickAt: string; secret: "ai" | "legacy" } | null;

/** The last call made by the cron job. Only a number for the admin page, so a
 *  failed read shows as "none yet". */
export async function getCronStatus(client: Client): Promise<CronStatus> {
  const { data, error } = await client
    .from("ai_worker_status")
    .select("last_tick_at, last_secret")
    .eq("worker", WORKER)
    .eq("source", "cron")
    .maybeSingle();
  if (error) {
    console.error("Couldn't read the worker status:", error);
    return null;
  }
  if (!data) return null;
  return { lastTickAt: data.last_tick_at, secret: data.last_secret as "ai" | "legacy" };
}

/** What the admin sees about the cron job, or null when nothing needs saying. */
export function describeCron(
  status: CronStatus,
  jobNeedsCron: boolean,
  now: number = Date.now(),
): { text: string; warning: boolean } | null {
  if (!status) {
    return jobNeedsCron
      ? {
          text: "The cron job hasn't called the sync route yet, so a long sync will stall until you press Resume.",
          warning: true,
        }
      : null;
  }

  const minutes = Math.max(0, Math.round((now - Date.parse(status.lastTickAt)) / 60_000));
  const secretNote =
    status.secret === "legacy"
      ? "It still uses the old Telegram secret."
      : "It uses the AI secret.";
  const silent = now - Date.parse(status.lastTickAt) > CRON_SILENT_MS;
  return {
    text: `Last cron call ${minutes} min ago. ${secretNote}${silent && jobNeedsCron ? " It has gone quiet while a sync needs it." : ""}`,
    warning: silent && jobNeedsCron,
  };
}
