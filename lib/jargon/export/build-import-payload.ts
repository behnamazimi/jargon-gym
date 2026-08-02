import type { ImportPayload } from "@/lib/jargon/import/types";
import type { Domain, Term } from "@/lib/jargon/types";

function optionalText(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildImportPayloadFromCollection(domain: Domain, terms: Term[]): ImportPayload {
  const payload: ImportPayload = {
    domain: domain.name,
    terms: terms.map((term) => {
      const example = optionalText(term.example);
      const discussion = optionalText(term.discussion);
      const controversy = optionalText(term.controversy);

      return {
        term: term.term,
        category: term.category,
        definition: term.definition,
        ...(example ? { example } : {}),
        ...(discussion ? { discussion } : {}),
        ...(controversy ? { controversy } : {}),
      };
    }),
  };

  const description = optionalText(domain.description);
  if (description) {
    payload.description = description;
  }

  const relationships = terms.flatMap((term) =>
    term.relationships
      .filter((relationship) => relationship.direction === "outgoing")
      .map((relationship) => {
        const relationshipDescription = optionalText(relationship.description);
        return {
          source: term.term,
          target: relationship.relatedTermName,
          relationship_type: relationship.relationshipType,
          ...(relationshipDescription ? { description: relationshipDescription } : {}),
        };
      }),
  );

  if (relationships.length > 0) {
    payload.relationships = relationships;
  }

  return payload;
}

export function exportFilename(domainName: string): string {
  const slug = domainName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "collection"}.json`;
}
