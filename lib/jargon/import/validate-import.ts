import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { importPayloadSchema } from "./schema";
import {
  emptyPayloadFailure,
  formatImportFailure,
  ImportExecutionError,
  jsonSyntaxFailure,
  validationFailure,
} from "./errors";
import type { ImportFailure, ImportPreview, ImportValidationIssue } from "./types";

type Client = SupabaseClient<Database>;

function zodPath(path: PropertyKey[]): string {
  if (path.length === 0) return "root";
  return path.map(String).join(".");
}

function formatZodIssue(issue: {
  path: PropertyKey[];
  message: string;
  code?: string;
  expected?: unknown;
  input?: unknown;
}): ImportValidationIssue {
  const formatted: ImportValidationIssue = {
    path: zodPath(issue.path),
    message: issue.message,
  };

  if (issue.expected !== undefined) {
    formatted.expected = String(issue.expected);
  }

  if (issue.input !== undefined && issue.code === "invalid_type") {
    formatted.received = Array.isArray(issue.input) ? "array" : typeof issue.input;
  }

  return formatted;
}

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
    return { ok: false, failure: jsonSyntaxFailure(message) };
  }

  const result = importPayloadSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map(formatZodIssue);
    return { ok: false, failure: validationFailure(issues) };
  }

  const termKeys = new Set<string>();
  const duplicateIssues: ImportValidationIssue[] = [];

  for (const [index, term] of result.data.terms.entries()) {
    const key = term.term.trim().toLowerCase();
    if (termKeys.has(key)) {
      duplicateIssues.push({
        path: `terms[${index}].term`,
        message: `Duplicate term "${term.term}" in import`,
        expected: "unique term name within this import",
      });
    }
    termKeys.add(key);
  }

  const relationshipIssues: ImportValidationIssue[] = [];

  for (const [index, rel] of (result.data.relationships ?? []).entries()) {
    const sourceKey = rel.source.trim().toLowerCase();
    const targetKey = rel.target.trim().toLowerCase();

    if (!termKeys.has(sourceKey)) {
      relationshipIssues.push({
        path: `relationships[${index}].source`,
        message: `Source term "${rel.source}" not found in terms[]`,
        expected: "term name that exists in terms[]",
      });
    }

    if (!termKeys.has(targetKey)) {
      relationshipIssues.push({
        path: `relationships[${index}].target`,
        message: `Target term "${rel.target}" not found in terms[]`,
        expected: "term name that exists in terms[]",
      });
    }

    if (sourceKey === targetKey) {
      relationshipIssues.push({
        path: `relationships[${index}]`,
        message: "A term cannot relate to itself",
      });
    }
  }

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
    .select("id")
    .eq("owner_id", ownerId)
    .ilike("name", payload.domain)
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

  return {
    domain: payload.domain,
    termCount: payload.terms.length,
    relationshipCount: payload.relationships?.length ?? 0,
    categories,
    isMerge: Boolean(existing),
  };
}
