import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { parseLanguage } from "@/lib/jargon/languages";
import { escapeLike } from "@/lib/jargon/like-escape";
import { importPayloadSchema } from "./schema";
import {
  emptyPayloadFailure,
  formatImportFailure,
  ImportExecutionError,
  jsonSyntaxFailure,
  validationFailure,
} from "./errors";
import { describeZodIssues } from "./issue-messages";
import { collectRelationshipIssues, collectTermKeys } from "./validate-import-issues";
import type { ImportFailure, ImportPreview } from "./types";

type Client = SupabaseClient<Database>;

export function parseImportJson(
  raw: string,
):
  | { ok: true; data: ReturnType<typeof importPayloadSchema.parse> }
  | { ok: false; failure: ImportFailure } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, failure: emptyPayloadFailure() };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON syntax";
    return { ok: false, failure: jsonSyntaxFailure(message, trimmed) };
  }

  const result = importPayloadSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      failure: validationFailure(describeZodIssues(result.error.issues, parsed)),
    };
  }

  const { termKeys, duplicateIssues } = collectTermKeys(result.data.terms);
  const relationshipIssues = collectRelationshipIssues(result.data.relationships ?? [], termKeys);

  const issues = [...duplicateIssues, ...relationshipIssues];
  if (issues.length > 0) {
    return { ok: false, failure: validationFailure(issues) };
  }

  return { ok: true, data: result.data };
}

export async function buildImportPreview(
  client: Client,
  ownerId: string,
  payload: ReturnType<typeof importPayloadSchema.parse>,
): Promise<ImportPreview> {
  const { data: existing, error } = await client
    .from("domains")
    .select("id, language")
    .eq("owner_id", ownerId)
    .ilike("name", escapeLike(payload.domain))
    .maybeSingle();

  if (error) {
    throw new ImportExecutionError(
      formatImportFailure(error, {
        step: "Could not check existing domain",
        domain: payload.domain,
      }),
    );
  }

  const categories = [...new Set(payload.terms.map((t) => t.category.trim()))].sort();

  let conflictingTerms: string[] = [];

  if (existing) {
    const { data: existingTerms, error: existingTermsError } = await client
      .from("terms")
      .select("term")
      .eq("domain_id", existing.id);

    if (existingTermsError) {
      throw new ImportExecutionError(
        formatImportFailure(existingTermsError, {
          step: "Could not check existing terms",
          domain: payload.domain,
        }),
      );
    }

    const existingKeys = new Set((existingTerms ?? []).map((row) => row.term.trim().toLowerCase()));

    conflictingTerms = payload.terms
      .filter((item) => existingKeys.has(item.term.trim().toLowerCase()))
      .map((item) => item.term.trim())
      .sort((a, b) => a.localeCompare(b));
  }

  return {
    domain: payload.domain,
    domainLanguage: existing ? parseLanguage(existing.language) : null,
    termCount: payload.terms.length,
    relationshipCount: payload.relationships?.length ?? 0,
    categories,
    isMerge: Boolean(existing),
    conflictingTerms,
  };
}
