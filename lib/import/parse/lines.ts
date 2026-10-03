const WHATSAPP_PREFIXES = [
  // [24/12/2025, 14:05:09] Name: …  (iOS)
  /^\[\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s?[AaPp][Mm])?\]\s*[^:]{1,50}:\s+/,
  // 24/12/2025, 14:05 - Name: …  (Android)
  /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s?[AaPp][Mm])?\s+-\s+[^:]{1,50}:\s+/,
  // [14:05, 24/12/2025] Name: …
  /^\[\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s?[AaPp][Mm])?,?\s+\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\]\s*[^:]{1,50}:\s+/,
];

const CHECKBOX = /^\s*(?:[-*•]\s+)?(?:\[[ xX✓✔]\]|[☐☑☒✅⬜✔✓])\s*/;
const BULLET = /^\s*[•◦▪‣∙*-]\s+/;
const NUMBERING = /^\s*(?:\d{1,3}|[A-Za-z])[.)]\s+/;

function stripChatPrefix(line: string): string {
  for (const prefix of WHATSAPP_PREFIXES) {
    if (prefix.test(line)) return line.replace(prefix, "");
  }
  return line;
}

/** Removes `[date, time] Name:` prefixes from every line, before the text is
 *  tested for CSV or tabs: those prefixes contain commas of their own. */
export function stripChatPrefixes(text: string): string {
  return text.split("\n").map(stripChatPrefix).join("\n");
}

/** Strips list furniture (bullets, numbering, checkboxes, WhatsApp prefixes)
 *  from one line. Numbers that belong to the term ("5G", "401(k)") stay. */
export function cleanLine(line: string): string {
  let result = stripChatPrefix(line.trim());
  result = result.replace(CHECKBOX, "").replace(BULLET, "").replace(NUMBERING, "");
  return result.trim();
}

/** Non-empty cleaned lines. */
export function cleanLines(text: string): string[] {
  return text
    .split("\n")
    .map(cleanLine)
    .filter((line) => line.length > 0);
}
