const MAX_LINES = 50;
const MAX_LINE_LENGTH = 100;

export type KnownTermsResult = { ok: true; value: string | null } | { ok: false; message: string };

/** One term per line: trimmed, blank lines dropped, repeats folded. */
export function normalizeKnownTerms(raw: string | undefined | null): KnownTermsResult {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const line of (raw ?? "").split(/\r?\n/)) {
    const term = line.trim();
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    seen.add(key);
    lines.push(term);
  }

  if (lines.length > MAX_LINES) {
    return { ok: false, message: `Keep it to ${MAX_LINES} terms, one per line.` };
  }
  if (lines.some((line) => line.length > MAX_LINE_LENGTH)) {
    return { ok: false, message: `Keep each term under ${MAX_LINE_LENGTH} characters.` };
  }
  return { ok: true, value: lines.length > 0 ? lines.join("\n") : null };
}
