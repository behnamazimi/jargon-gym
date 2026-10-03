import type { SeparatorChoice } from "./types";

const PATTERNS: Record<Exclude<SeparatorChoice, "custom">, RegExp> = {
  tab: /\t/,
  // Only a spaced dash or an en/em dash: never the hyphen inside "follow-up".
  dash: /\s[–—]\s|\s-\s|^[–—]\s|\s[–—]$/,
  // A colon followed by a space: not "10:30", "https://…" or "3:1".
  colon: /:\s+/,
  equals: /\s=\s/,
  comma: /,\s*/,
};

/** The order a separator wins ties in. Comma is the last resort. */
const AUTO_ORDER: Exclude<SeparatorChoice, "custom">[] = [
  "tab",
  "dash",
  "colon",
  "equals",
  "comma",
];

function patternFor(choice: SeparatorChoice, custom: string | undefined): RegExp | null {
  if (choice !== "custom") return PATTERNS[choice];
  const text = custom?.trim();
  if (!text) return null;
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

/** Splits at the first occurrence. Returns the two halves, trimmed. */
export function splitLine(
  line: string,
  choice: SeparatorChoice,
  custom?: string,
): [string, string] | null {
  const pattern = patternFor(choice, custom);
  if (!pattern) return null;
  const match = pattern.exec(line);
  if (!match) return null;
  return [line.slice(0, match.index).trim(), line.slice(match.index + match[0].length).trim()];
}

function coverage(lines: string[], choice: SeparatorChoice, custom?: string) {
  let covered = 0;
  let termLength = 0;
  for (const line of lines) {
    const parts = splitLine(line, choice, custom);
    if (parts && parts[0] && parts[1]) {
      covered += 1;
      termLength += parts[0].length;
    }
  }
  return { covered, averageTerm: covered ? termLength / covered : Infinity };
}

/** The separator that splits the most lines, or null if none reaches half.
 *  Ties go to the one that leaves the shorter term. Comma only wins when
 *  nothing else does. */
export function chooseSeparator(lines: string[]): SeparatorChoice | null {
  if (lines.length === 0) return null;
  const threshold = Math.ceil(lines.length / 2);

  let best: { choice: SeparatorChoice; covered: number; averageTerm: number } | null = null;
  for (const choice of AUTO_ORDER) {
    if (choice === "comma" && best) continue;
    const { covered, averageTerm } = coverage(lines, choice);
    if (covered < threshold) continue;
    if (
      !best ||
      covered > best.covered ||
      (covered === best.covered && averageTerm < best.averageTerm)
    ) {
      best = { choice, covered, averageTerm };
    }
  }
  return best?.choice ?? null;
}
