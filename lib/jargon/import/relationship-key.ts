export function normalizeRelationshipKey(
  source: string,
  target: string,
  relationshipType: string,
): string {
  return `${source.trim().toLowerCase()}|${target.trim().toLowerCase()}|${relationshipType.trim().toLowerCase()}`;
}
