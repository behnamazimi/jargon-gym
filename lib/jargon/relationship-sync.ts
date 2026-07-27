import type { RelationshipDraft, RelationshipSyncPayload } from "@/lib/jargon/relationship-schema";

function relationshipChanged(initial: RelationshipDraft, current: RelationshipDraft) {
  return (
    initial.relatedTermId !== current.relatedTermId ||
    initial.relationshipType !== current.relationshipType ||
    initial.description !== current.description
  );
}

export function buildRelationshipSync(
  initial: RelationshipDraft[],
  current: RelationshipDraft[],
): RelationshipSyncPayload {
  const deleteIds: string[] = [];

  for (const rel of initial) {
    if (!rel.id) continue;
    if (!current.some((item) => item.id === rel.id)) {
      deleteIds.push(rel.id);
    }
  }

  const create = current
    .filter((rel) => !rel.id && rel.direction === "outgoing")
    .map((rel) => ({
      targetTermId: rel.relatedTermId,
      relationshipType: rel.relationshipType.trim(),
      description: rel.description.trim(),
    }));

  const update = current
    .filter((rel) => rel.id && rel.direction === "outgoing")
    .filter((rel) => {
      const original = initial.find((item) => item.id === rel.id);
      return original ? relationshipChanged(original, rel) : false;
    })
    .map((rel) => ({
      id: rel.id!,
      targetTermId: rel.relatedTermId,
      relationshipType: rel.relationshipType.trim(),
      description: rel.description.trim(),
    }));

  return {
    create,
    update,
    deleteIds: [...new Set(deleteIds)],
  };
}

export function validateRelationshipDrafts(
  drafts: RelationshipDraft[],
  sourceTermId?: string,
): string | null {
  for (const draft of drafts) {
    if (draft.direction !== "outgoing") continue;

    if (!draft.relatedTermId) {
      return "Choose a related term for each relationship.";
    }

    if (sourceTermId && draft.relatedTermId === sourceTermId) {
      return "A term can't relate to itself.";
    }

    if (!draft.relationshipType.trim()) {
      return "Each relationship needs a type (e.g. often confused with).";
    }
  }

  return null;
}

export function termRelationshipsToDrafts(
  relationships: Array<{
    id: string;
    relationshipType: string;
    description: string;
    direction: "outgoing" | "incoming";
    relatedTermId: string;
    relatedTermName: string;
  }>,
): RelationshipDraft[] {
  return relationships.map((rel) => ({
    key: rel.id,
    id: rel.id,
    direction: rel.direction,
    relatedTermId: rel.relatedTermId,
    relatedTermName: rel.relatedTermName,
    relationshipType: rel.relationshipType,
    description: rel.description,
  }));
}
