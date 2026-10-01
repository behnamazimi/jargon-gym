import Papa from "papaparse";

function trimTrailingEmpty(row: string[]): string[] {
  let end = row.length;
  while (end > 0 && row[end - 1].trim() === "") end--;
  return row.slice(0, end);
}

/** Rows of cells from delimited text. The delimiter is always given, never
 *  guessed, so our own rules decide. Quoted cells may hold line breaks. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const { data } = Papa.parse<string[]>(text, { delimiter, skipEmptyLines: "greedy" });
  return data
    .map((row) => trimTrailingEmpty(row.map((cell) => cell.trim())))
    .filter((row) => row.length > 0);
}

/** True when most non-empty lines have the same number (2+) of fields. */
export function hasConsistentFields(text: string, delimiter: string): boolean {
  const rows = parseDelimited(text, delimiter);
  if (rows.length === 0) return false;
  const counts = new Map<number, number>();
  for (const row of rows) counts.set(row.length, (counts.get(row.length) ?? 0) + 1);
  const [width, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return width >= 2 && count / rows.length >= 0.8;
}
