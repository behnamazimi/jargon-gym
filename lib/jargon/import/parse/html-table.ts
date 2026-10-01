import { decodeHTML } from "entities";

function cellText(html: string): string {
  const withBreaks = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(?:p|div)>/gi, "\n");
  const text = decodeHTML(withBreaks.replace(/<[^>]*>/g, ""));
  return text
    .replace(/ /g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

/** Rows and cells from the first table in clipboard HTML, or null when there
 *  isn't one. A string parser, so it also runs where there is no DOM. */
export function extractHtmlTable(html: string): string[][] | null {
  const table = /<table[\s>][\s\S]*?<\/table>/i.exec(html);
  if (!table) return null;

  const rows: string[][] = [];
  for (const row of table[0].matchAll(/<tr[\s>][\s\S]*?<\/tr>/gi)) {
    const cells = [...row[0].matchAll(/<t[dh][\s>][\s\S]*?<\/t[dh]>/gi)].map((cell) =>
      cellText(cell[0].replace(/^<t[dh][^>]*>/i, "").replace(/<\/t[dh]>$/i, "")),
    );
    if (cells.some((cell) => cell)) rows.push(cells);
  }
  return rows.length > 0 ? rows : null;
}
