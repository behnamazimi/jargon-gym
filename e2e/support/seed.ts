import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadSupabaseEnv } from "./env";
import type { TestUser } from "./users";

export type SeedTerm = { term: string; definition?: string };

export const SAMPLE_TERMS: SeedTerm[] = [
  { term: "Idempotent", definition: "Safe to run more than once with the same result." },
  { term: "Latency", definition: "The delay between a request and its response." },
  { term: "Throughput", definition: "How much work a system finishes per unit of time." },
  { term: "Backpressure", definition: "Slowing producers down when consumers fall behind." },
  { term: "Sharding", definition: "Splitting data across machines by a key." },
  { term: "Quorum", definition: "The minimum number of votes needed to agree." },
  { term: "Tombstone", definition: "A marker that says a record was deleted." },
  { term: "Jitter", definition: "Random variation added to a delay." },
  { term: "Circuit breaker", definition: "Stops calling a failing service for a while." },
  { term: "Canary", definition: "A small rollout used to catch problems early." },
];

/** Imports terms into a new collection as the user, through the same RPC the app's importer calls. */
export async function seedCollection(
  user: TestUser,
  terms: SeedTerm[] = SAMPLE_TERMS,
  name = `E2E ${randomUUID().slice(0, 8)}`,
): Promise<{ domainId: string; name: string }> {
  const env = loadSupabaseEnv();
  const client = createClient(env.url, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signedIn = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (signedIn.error) throw new Error(signedIn.error.message);

  const { data, error } = await client.rpc("my_import_terms", {
    p_import_id: randomUUID(),
    p_destination: { name, language: "en" },
    p_terms: terms,
    p_relationships: [],
    p_policy: "skip",
    p_entry: "chooser",
    p_source: "paste",
    p_format: "pairs",
  });
  if (error) throw new Error(error.message);
  return { domainId: (data as { domain_id: string }).domain_id, name };
}
