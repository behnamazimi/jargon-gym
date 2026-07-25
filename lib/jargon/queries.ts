import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export async function fetchDomains(client: Client) {
  const { data, error } = await client
    .from("domains")
    .select("id, name, icon_url")
    .order("name");

  if (error) throw error;
  return data;
}

export async function fetchTermsByDomain(client: Client, domainId: string) {
  const { data, error } = await client
    .from("terms")
    .select("*")
    .eq("domain_id", domainId)
    .order("category")
    .order("term");

  if (error) throw error;
  return data;
}

export async function fetchKnownTermIds(client: Client) {
  const { data, error } = await client
    .from("user_progress")
    .select("term_id")
    .eq("is_known", true);

  if (error) throw error;
  return data.map((row) => row.term_id);
}

export async function upsertTermKnown(
  client: Client,
  userId: string,
  termId: string,
  isKnown: boolean,
) {
  const { error } = await client.from("user_progress").upsert(
    {
      user_id: userId,
      term_id: termId,
      is_known: isKnown,
    },
    { onConflict: "user_id,term_id" },
  );

  if (error) throw error;
}
