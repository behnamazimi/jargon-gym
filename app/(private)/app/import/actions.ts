"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser, requireAuthenticatedClient } from "@/lib/auth/require-session";
import { commitFailureFor } from "@/lib/import/commit-errors";
import {
  batchResultSchema,
  commitImportSchema,
  MAX_IMPORT_TERMS,
} from "@/lib/import/commit-schema";
import {
  findDestinationMatches,
  listCollectionTermNames,
  listImportDestinations,
  type DestinationMatch,
} from "@/lib/import/import-collections";
import type { ImportFailure } from "@/lib/import/types";

const NOT_SIGNED_IN: ImportFailure = { title: "Not logged in", message: "Log in to add terms." };

export async function getImportSetupData() {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: "Log in to add terms." as const };

  return listImportDestinations(auth.supabase, auth.user.id);
}

const checkSchema = z.object({
  domainId: z.guid(),
  terms: z.array(z.string().max(200)).max(MAX_IMPORT_TERMS),
});

/** Which of these terms the destination already has. */
export async function checkImportAgainstDestination(
  input: unknown,
): Promise<{ matches: DestinationMatch[] } | { error: string }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: "Log in to add terms." };

  const parsed = checkSchema.safeParse(input);
  if (!parsed.success) return { error: "We couldn't check that list. Try again." };

  try {
    const matches = await findDestinationMatches(
      auth.supabase,
      auth.user.id,
      parsed.data.domainId,
      parsed.data.terms,
    );
    if (!matches) return { error: "That collection isn't available any more. Choose another." };
    return { matches };
  } catch {
    return { error: "We couldn't check what's already there. Try again." };
  }
}

/** A collection's term names, for the "exclude terms" box of the developer command. */
export async function getCollectionTermNames(
  domainId: unknown,
): Promise<{ terms: string[] } | { error: string }> {
  const id = z.guid().safeParse(domainId);
  if (!id.success) return { error: "That collection isn't available." };

  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: "Log in to add terms." };

  try {
    const terms = await listCollectionTermNames(auth.supabase, auth.user.id, id.data);
    return terms ? { terms } : { error: "That collection isn't available." };
  } catch {
    return { error: "We couldn't load that collection's terms. Try again." };
  }
}

/** Adds the terms in one transaction, then opens the collection. Returns only
 *  when something went wrong, and nothing was added. */
export async function commitImport(input: unknown): Promise<{ ok: false; failure: ImportFailure }> {
  const parsed = commitImportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      failure: commitFailureFor({ message: parsed.error.issues.length > 0 ? "invalid" : "" }),
    };
  }

  const { supabase, user } = await getSessionUser();
  if (!user) return { ok: false, failure: NOT_SIGNED_IN };

  const data = parsed.data;
  const name = "name" in data.destination ? data.destination.name : undefined;

  const { data: raw, error } = await supabase.rpc("my_import_terms", {
    p_import_id: data.importId,
    p_destination:
      "domainId" in data.destination
        ? { domain_id: data.destination.domainId }
        : { name: data.destination.name, language: data.destination.language },
    p_terms: data.terms,
    p_relationships: data.links,
    p_policy: data.policy,
    p_entry: data.entry,
    p_source: data.source,
    p_format: data.format,
  });

  const result = error ? null : batchResultSchema.safeParse(raw);
  if (error || !result?.success) {
    return { ok: false, failure: commitFailureFor(error, name) };
  }

  revalidatePath("/app/library");
  redirect(`/app/library?domain=${result.data.domain_id}&added=${data.importId}`);
}
