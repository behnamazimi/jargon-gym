import type { Term, UnfinishedTerm } from "@/lib/terms/types";

type ExportTerm = Pick<Term | UnfinishedTerm, "term" | "definition" | "category">;

/** One term per line, "Term – definition". A term with no definition is just
 *  its name, so the text pastes back into the importer as it is. */
export function collectionToText(terms: ExportTerm[]): string {
  return terms
    .map((item) =>
      item.definition ? `${item.term} – ${item.definition.replace(/\s*\n\s*/g, " ")}` : item.term,
    )
    .join("\n");
}

/** A cell that starts with one of these is run as a formula by spreadsheet apps. */
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(value: string | null): string {
  const raw = value ?? "";
  const text = FORMULA_START.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Term, Definition and Category columns with a heading row. */
export function collectionToCsv(terms: ExportTerm[]): string {
  const rows = terms.map((item) =>
    [item.term, item.definition, item.category].map(csvCell).join(","),
  );
  return ["Term,Definition,Category", ...rows].join("\n");
}
