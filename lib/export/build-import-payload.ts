import type { ImportPayload } from "@/lib/import/types";
import type { Collection, Term, UnfinishedTerm } from "@/lib/terms/types";

function optionalText(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildImportPayloadFromCollection(
  collection: Collection,
  terms: (Term | UnfinishedTerm)[],
): ImportPayload {
  const payload: ImportPayload = {
    collection: collection.name,
    language: collection.language,
    terms: terms.map((term) => {
      const example = optionalText(term.example);
      const mentalModel = optionalText(term.mentalModel);
      const discussion = optionalText(term.discussion);
      const antiExample = optionalText(term.antiExample);
      const controversy = optionalText(term.controversy);
      const note = optionalText(term.note);

      return {
        term: term.term,
        ...(term.category ? { category: term.category } : {}),
        ...(term.definition ? { definition: term.definition } : {}),
        ...(example ? { example } : {}),
        ...(mentalModel ? { mental_model: mentalModel } : {}),
        ...(discussion ? { discussion } : {}),
        ...(antiExample ? { anti_example: antiExample } : {}),
        ...(controversy ? { controversy } : {}),
        ...(note ? { note } : {}),
      };
    }),
  };

  const description = optionalText(collection.description);
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

export function exportFilename(collectionName: string): string {
  const slug = collectionName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "collection"}.json`;
}
