import type { DomainLanguage } from "@/lib/terms/languages";
import { jsonSyntaxFailure, validationFailure } from "./errors";
import { describeZodIssues } from "./issue-messages";
import { buildTerms } from "./parse/build-terms";
import type { BuiltTerms, ColumnRole, ParsedList } from "./parse/types";
import { importPayloadSchema } from "./schema";
import type { ImportFailure } from "./types";

type JsonLink = {
  source: string;
  target: string;
  relationship_type: string;
  description: string;
};

export type JsonImport = {
  domain: string;
  language: DomainLanguage | null;
  description: string | null;
  built: BuiltTerms;
  links: JsonLink[];
};

export type JsonReadResult =
  | { ok: true; data: JsonImport }
  | { ok: false; reason: "syntax" | "invalid"; failure: ImportFailure };

const ROLES: ColumnRole[] = [
  "term",
  "definition",
  "category",
  "example",
  "mental_model",
  "discussion",
  "anti_example",
  "controversy",
  "note",
];

/** Reads JSON in the import shape. Only a broken structure blocks. Repeated
 *  terms are folded like any pasted list, and links to terms that aren't
 *  in the file are left for the commit to drop and count. */
export function readJsonImport(raw: string): JsonReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON syntax";
    return { ok: false, reason: "syntax", failure: jsonSyntaxFailure(message, raw.trim()) };
  }

  const result = importPayloadSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      reason: "invalid",
      failure: validationFailure(describeZodIssues(result.error.issues, parsed)),
    };
  }

  const payload = result.data;
  const list: ParsedList = {
    format: "json",
    rows: payload.terms.map((item) => [
      item.term,
      item.definition ?? "",
      item.category ?? "",
      item.example ?? "",
      item.mental_model ?? "",
      item.discussion ?? "",
      item.anti_example ?? "",
      item.controversy ?? "",
      item.note ?? "",
    ]),
    heading: null,
    headingDetected: false,
    separator: null,
    roles: ROLES,
  };

  return {
    ok: true,
    data: {
      domain: payload.domain,
      language: payload.language ?? null,
      description: payload.description ?? null,
      built: buildTerms(list),
      links: payload.relationships.map((link) => ({
        source: link.source,
        target: link.target,
        relationship_type: link.relationship_type,
        description: link.description,
      })),
    },
  };
}
