/** Relationship types are free text from glossary data, so snake_case values
 *  such as "leads_to" read as "leads to". */
export function relationshipLabel(type: string): string {
  return type.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
}
