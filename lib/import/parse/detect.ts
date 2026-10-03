import { cleanAnkiField, parseAnkiHeaders, roleForHeading } from "./anki";
import { hasConsistentFields, parseDelimited } from "./delimited";
import { looksLikeHeading } from "./heading";
import { extractHtmlTable } from "./html-table";
import { cleanLines, stripChatPrefixes } from "./lines";
import { normalizeText } from "./normalize";
import { looksLikePairs } from "./pairs";
import { chooseSeparator, splitLine } from "./split";
import type { ColumnRole, ImportFormat, ParseOptions, ParsedList, SeparatorChoice } from "./types";

/** True when the text starts like JSON. */
export function looksLikeJson(text: string): boolean {
  const first = normalizeText(text).trimStart()[0];
  return first === "{" || first === "[";
}

function defaultRoles(width: number, heading: string[] | null): ColumnRole[] {
  const fromHeading = heading?.map((cell) => roleForHeading(cell) ?? "ignore");
  if (fromHeading?.includes("term")) return fromHeading;

  const roles: ColumnRole[] = [];
  for (let index = 0; index < width; index++) {
    roles.push(index === 0 ? "term" : index === 1 ? "definition" : "ignore");
  }
  return roles;
}

function finish(
  format: ImportFormat,
  allRows: string[][],
  separator: SeparatorChoice | null,
  options: ParseOptions,
  headingHint?: string[],
): ParsedList {
  const rows = allRows.filter((row) => row.some((cell) => cell.trim()));
  const headingDetected = headingHint ? false : rows.length > 0 && looksLikeHeading(rows[0]);
  const useHeading = !headingHint && (options.heading ?? headingDetected) && rows.length > 0;
  const heading = headingHint ?? (useHeading ? rows[0] : null);
  const body = useHeading ? rows.slice(1) : rows;
  const width = Math.max(1, heading?.length ?? 0, ...body.map((row) => row.length));

  return {
    format,
    rows: body,
    heading,
    headingDetected,
    separator,
    roles: options.roles ?? defaultRoles(width, heading),
  };
}

function mostLinesHaveTabs(text: string): boolean {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return false;
  return lines.filter((line) => line.includes("\t")).length / lines.length >= 0.5;
}

function listRows(
  lines: string[],
  separator: SeparatorChoice | null,
  custom: string | undefined,
): string[][] {
  return lines.map((line) => {
    const parts = separator ? splitLine(line, separator, custom) : null;
    if (!parts) return [line];
    return parts[1] ? [parts[0], parts[1]] : [parts[0]];
  });
}

function parseTable(text: string, options: ParseOptions): ParsedList | null {
  if (options.html) {
    const table = extractHtmlTable(options.html);
    if (table) return finish("html_table", table, null, options);
  }

  if (options.separator) return null;

  const anki = parseAnkiHeaders(text);
  if (anki) {
    const rows = parseDelimited(anki.body, anki.separator).map((row) => row.map(cleanAnkiField));
    return finish("anki", rows, null, options, anki.columns?.map(cleanAnkiField));
  }

  if (mostLinesHaveTabs(text)) return finish("tsv", parseDelimited(text, "\t"), "tab", options);
  for (const delimiter of [";", ","]) {
    if (hasConsistentFields(text, delimiter)) {
      return finish("csv", parseDelimited(text, delimiter), null, options);
    }
  }
  return null;
}

function parseLines(text: string, options: ParseOptions): ParsedList {
  const lines = cleanLines(text);
  const separator = options.separator ?? chooseSeparator(lines);

  if (separator) {
    return finish("lines", listRows(lines, separator, options.customSeparator), separator, options);
  }
  if (looksLikePairs(lines)) {
    const rows: string[][] = [];
    for (let index = 0; index < lines.length; index += 2)
      rows.push([lines[index], lines[index + 1]]);
    return finish("pairs", rows, null, options);
  }
  return finish(
    "words",
    lines.map((line) => [line]),
    null,
    options,
  );
}

function splitCards(raw: string, options: ParseOptions): string {
  const separator = options.cardSeparator?.trim() ?? "";
  return separator ? raw.split(separator).join("\n") : raw;
}

/** Works out what a pasted list is and splits it into rows of cells. Rules
 *  run in a fixed order and the first match wins. Pure: the same text and
 *  options always give the same answer. */
export function parseList(raw: string, options: ParseOptions = {}): ParsedList {
  const text = stripChatPrefixes(normalizeText(splitCards(raw, options)));
  return parseTable(text, options) ?? parseLines(text, options);
}
