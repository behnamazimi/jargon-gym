"use server";

import { z } from "zod";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { escapeLike } from "@/lib/jargon/like-escape";

const inputSchema = z.object({
  domainId: z.guid(),
  term: z.string().trim().min(1).max(200),
});

export type CaptureDuplicate =
  | { ok: true; match: { term: string; finished: boolean } | null }
  | { ok: false };

/** The term this collection already has under that name, if any. Same rule as
 *  the unique index: case and surrounding spaces don't count. Only collections
 *  the caller owns are looked at. */
export async function findCaptureDuplicate(input: unknown): Promise<CaptureDuplicate> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { ok: false };

  const { data, error } = await auth.supabase
    .from("terms")
    .select("term, definition, domains!inner(owner_id)")
    .eq("domain_id", parsed.data.domainId)
    .eq("domains.owner_id", auth.user.id)
    .ilike("term", escapeLike(parsed.data.term))
    .limit(1);

  if (error) return { ok: false };
  const row = data[0];
  return {
    ok: true,
    match: row ? { term: row.term, finished: row.definition !== null } : null,
  };
}
