import { normalizeRelationshipKey } from "./relationship-key";
import type { ImportValidationIssue } from "./types";

export function collectTermKeys(terms: { term: string }[]): {
  termKeys: Set<string>;
  duplicateIssues: ImportValidationIssue[];
} {
  const termKeys = new Set<string>();
  const duplicateIssues: ImportValidationIssue[] = [];

  for (const term of terms) {
    const key = term.term.trim().toLowerCase();
    if (termKeys.has(key)) {
      duplicateIssues.push({
        message: `"${term.term.trim()}" appears twice. Keep one of them.`,
      });
    }
    termKeys.add(key);
  }

  return { termKeys, duplicateIssues };
}

type Rel = { source: string; target: string; relationship_type: string };

function relationshipIssuesFor(
  rel: Rel,
  termKeys: Set<string>,
  relationshipKeys: Set<string>,
): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];
  const sourceKey = rel.source.trim().toLowerCase();
  const targetKey = rel.target.trim().toLowerCase();
  const relationshipKey = normalizeRelationshipKey(rel.source, rel.target, rel.relationship_type);

  if (relationshipKeys.has(relationshipKey)) {
    issues.push({
      message: `The link from "${rel.source}" to "${rel.target}" (${rel.relationship_type}) is listed twice.`,
    });
  }
  relationshipKeys.add(relationshipKey);

  if (!termKeys.has(sourceKey)) {
    issues.push({
      message: `The link from "${rel.source}" to "${rel.target}" points to a term that isn't in your list: "${rel.source}".`,
    });
  }

  if (!termKeys.has(targetKey)) {
    issues.push({
      message: `The link from "${rel.source}" to "${rel.target}" points to a term that isn't in your list: "${rel.target}".`,
    });
  }

  if (sourceKey === targetKey) {
    issues.push({ message: `"${rel.source.trim()}" can't be linked to itself.` });
  }

  return issues;
}

export function collectRelationshipIssues(
  relationships: Rel[],
  termKeys: Set<string>,
): ImportValidationIssue[] {
  const relationshipKeys = new Set<string>();
  const issues: ImportValidationIssue[] = [];

  for (const rel of relationships) {
    issues.push(...relationshipIssuesFor(rel, termKeys, relationshipKeys));
  }

  return issues;
}
