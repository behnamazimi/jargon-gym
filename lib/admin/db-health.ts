import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type TableSize = { name: string; rows: number; bytes: number };

export type TableHealth = TableSize & {
  watch: boolean;
  /** The limit that was passed, in words; null while the table is under both. */
  reason: string | null;
};

type Limit = { rows: number; bytes: number };

const GB = 1024 ** 3;
const MB = 1024 ** 2;

/** Past either figure a table is worth a look. review_events is the one that
 *  grows with every study action and is never trimmed; the rest are bounded by
 *  a retention job or by how much people add. */
const LIMITS: Record<string, Limit> = {
  review_events: { rows: 2_000_000, bytes: GB },
  review_state: { rows: 1_000_000, bytes: GB },
  terms: { rows: 500_000, bytes: GB },
  stories: { rows: 200_000, bytes: GB },
  audio_jobs: { rows: 100_000, bytes: 250 * MB },
  ai_usage_events: { rows: 500_000, bytes: 250 * MB },
  narration_sync_jobs: { rows: 10_000, bytes: 100 * MB },
  admin_audit_log: { rows: 100_000, bytes: 100 * MB },
};

export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

export function assessTable(size: TableSize): TableHealth {
  const limit = LIMITS[size.name];
  if (limit && size.rows >= limit.rows) {
    return {
      ...size,
      watch: true,
      reason: `over ${limit.rows.toLocaleString("en-US")} rows`,
    };
  }
  if (limit && size.bytes >= limit.bytes) {
    return { ...size, watch: true, reason: `over ${formatBytes(limit.bytes)}` };
  }
  return { ...size, watch: false, reason: null };
}

export async function loadTableHealth(client: Client): Promise<TableHealth[]> {
  const { data, error } = await client.rpc("admin_table_sizes");
  if (error) throw error;
  return data.map((row) =>
    assessTable({ name: row.table_name, rows: row.row_estimate, bytes: row.total_bytes }),
  );
}
