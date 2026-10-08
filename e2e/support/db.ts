import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import { loadSupabaseEnv } from "./env";

let admin: SupabaseClient | undefined;
let pool: Pool | undefined;

/** Auth admin API (creating users). Table access goes through `sql`, as service_role has no table grants. */
export function authAdmin(): SupabaseClient["auth"]["admin"] {
  if (!admin) {
    const env = loadSupabaseEnv();
    admin = createClient(env.url, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin.auth.admin;
}

/** Direct database access for seeding and for asserting on stored state. Scope queries by user. */
export async function sql<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  pool ??= new Pool({ connectionString: loadSupabaseEnv().dbUrl, max: 2 });
  const result = await pool.query(text, values);
  return result.rows as T[];
}
