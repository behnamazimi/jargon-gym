import { normalizeRelationshipKey } from "./relationship-key";
import type { ImportValidationIssue } from "./types";

export function collectTermKeys(terms: { term: string }[]): {
  termKeys: Set<string>;
  duplicateIssues: ImportValidationIssue[];
} {
  const termKeys = new Set<string>();
  const duplicateIssues: ImportValidationIssue[] = [];

  for (const [index, term] of terms.entries()) {
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

  return { termKeys, duplicateIssues };
}

type Rel = { source: string; target: string; relationship_type: string };

function relationshipIssuesFor(
  rel: Rel,
  index: number,
  termKeys: Set<string>,
  relationshipKeys: Set<string>,
): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];
  const sourceKey = rel.source.trim().toLowerCase();
  const targetKey = rel.target.trim().toLowerCase();
  const relationshipKey = normalizeRelationshipKey(rel.source, rel.target, rel.relationship_type);

  if (relationshipKeys.has(relationshipKey)) {
    issues.push({
      path: `relationships[${index}]`,
      message: `Duplicate relationship "${rel.source}" → "${rel.target}" (${rel.relationship_type}) in import`,
      expected: "unique source, target, and relationship type within this import",
    });
  }
  relationshipKeys.add(relationshipKey);

  if (!termKeys.has(sourceKey)) {
    issues.push({
      path: `relationships[${index}].source`,
      message: `Source term "${rel.source}" not found in terms[]`,
      expected: "term name that exists in terms[]",
    });
  }

  if (!termKeys.has(targetKey)) {
    issues.push({
      path: `relationships[${index}].target`,
      message: `Target term "${rel.target}" not found in terms[]`,
      expected: "term name that exists in terms[]",
    });
  }

  if (sourceKey === targetKey) {
    issues.push({
      path: `relationships[${index}]`,
      message: "A term cannot relate to itself",
    });
  }

  return issues;
}

export function collectRelationshipIssues(
  relationships: Rel[],
  termKeys: Set<string>,
): ImportValidationIssue[] {
  const relationshipKeys = new Set<string>();
  const issues: ImportValidationIssue[] = [];

  for (const [index, rel] of relationships.entries()) {
    issues.push(...relationshipIssuesFor(rel, index, termKeys, relationshipKeys));
  }

  return issues;
}
