import { roleForHeading } from "./anki";

/** True when every filled cell is a known heading word and at least one is
 *  there. A real first term called "Definition" has a normal definition next
 *  to it, so it isn't taken for a heading. */
export function looksLikeHeading(cells: string[]): boolean {
  const filled = cells.filter((cell) => cell.trim());
  if (filled.length === 0) return false;
  return filled.every((cell) => roleForHeading(cell) !== null);
}
