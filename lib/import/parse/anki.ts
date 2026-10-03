import { decodeHTML } from "entities";
import type { ColumnRole } from "./types";

const SEPARATOR_NAMES: Record<string, string> = {
  tab: "\t",
  comma: ",",
  semicolon: ";",
  space: " ",
  pipe: "|",
  colon: ":",
};

export type AnkiHeaders = {
  separator: string;
  html: boolean;
  columns: string[] | null;
  /** The text after the `#` header lines. */
  body: string;
};

/** Anki "Notes in Plain Text" starts with `#key:value` lines. Null when the
 *  text has none of the ones we use. */
export function parseAnkiHeaders(text: string): AnkiHeaders | null {
  const lines = text.split("\n");
  let separator: string | null = null;
  let html = false;
  let columns: string[] | null = null;
  let index = 0;

  for (; index < lines.length; index++) {
    const line = lines[index];
    if (!line.startsWith("#")) break;
    const match = /^#([a-z ]+):(.*)$/i.exec(line);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (key === "separator") separator = SEPARATOR_NAMES[value.toLowerCase()] ?? value;
    else if (key === "html") html = value.toLowerCase() === "true";
    else if (key === "columns") columns = value.split(separator ?? "\t");
  }

  if (index === 0 || (separator === null && !html && !columns)) return null;
  return { separator: separator ?? "\t", html, columns, body: lines.slice(index).join("\n") };
}

/** Card fields to plain text: no tags, entities decoded, no sound or image
 *  markers, cloze deletions flattened to their answer. */
export function cleanAnkiField(field: string): string {
  const text = field
    .replace(/\[sound:[^\]]*\]/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/\{\{c\d+::(.*?)(?:::[^}]*)?\}\}/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:div|p)>/gi, "\n")
    .replace(/<[^>]*>/g, "");
  return decodeHTML(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

const COLUMN_NAME_ROLES: [RegExp, ColumnRole][] = [
  [/^(?:term|word|front|woord|begrip|question|vraag)$/i, "term"],
  [/^(?:definition|meaning|translation|back|betekenis|vertaling|answer|antwoord)$/i, "definition"],
  [/^(?:example|voorbeeld)$/i, "example"],
  [/^(?:notes?|notitie|notities)$/i, "note"],
  [/^(?:categor(?:y|ie)|tags?|deck)$/i, "category"],
];

/** The role a heading word stands for, or null when it isn't one. */
export function roleForHeading(name: string): ColumnRole | null {
  const trimmed = name.trim();
  for (const [pattern, role] of COLUMN_NAME_ROLES) {
    if (pattern.test(trimmed)) return role;
  }
  return null;
}
