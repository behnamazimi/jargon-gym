import type { Term, UnfinishedTerm } from "@/lib/jargon/types";

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

function csvCell(value: string | null): string {
  const text = value ?? "";
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Term, Definition and Category columns with a heading row. */
export function collectionToCsv(terms: ExportTerm[]): string {
  const rows = terms.map((item) =>
    [item.term, item.definition, item.category].map(csvCell).join(","),
  );
  return ["Term,Definition,Category", ...rows].join("\n");
}
