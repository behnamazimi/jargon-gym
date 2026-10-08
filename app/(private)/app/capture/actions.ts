"use server";

import { z } from "zod";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { escapeLike } from "@/lib/terms/like-escape";

const inputSchema = z.object({
  collectionId: z.guid(),
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
    .select("term, definition, collections!inner(owner_id)")
    .eq("collection_id", parsed.data.collectionId)
    .eq("collections.owner_id", auth.user.id)
    .ilike("term", escapeLike(parsed.data.term))
    .limit(1);

  if (error) return { ok: false };
  const row = data[0];
  return {
    ok: true,
    match: row ? { term: row.term, finished: row.definition !== null } : null,
  };
}

const contextSchema = z.object({ collectionId: z.guid() });

export type CaptureTerm = { id: string; term: string; category: string | null };

export type CaptureContext = { ok: true; terms: CaptureTerm[] } | { ok: false };

/** The finished terms of a collection the caller owns, so the form can offer
 *  links between terms and default the category to the one most terms use. */
export async function loadCaptureTerms(input: unknown): Promise<CaptureContext> {
  const parsed = contextSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { ok: false };

  const { data, error } = await auth.supabase
    .from("terms")
    .select("id, term, category, collections!inner(owner_id)")
    .eq("collection_id", parsed.data.collectionId)
    .eq("collections.owner_id", auth.user.id)
    .not("definition", "is", null)
    .order("term");

  if (error) return { ok: false };
  return {
    ok: true,
    terms: data.map(({ id, term, category }) => ({ id, term, category })),
  };
}
