export type SimilarName = { kind: "exact" | "near"; name: string };

const MIN_LENGTH = 4;

function normalize(value: string): string {
  return value
    .replace(/[​-‍﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Optimal string alignment distance: edits plus adjacent swaps. */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[a.length][b.length];
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/** The existing name a typed collection name most likely means, if any. A
 *  difference in digits ("Biology 1" vs "Biology 2") is never a typo. */
export function findSimilarName(input: string, existingNames: string[]): SimilarName | null {
  const typed = normalize(input);
  if (!typed) return null;

  let best: { name: string; distance: number } | null = null;

  for (const name of existingNames) {
    const candidate = normalize(name);
    if (candidate === typed) return { kind: "exact", name };

    if (typed.length < MIN_LENGTH || candidate.length < MIN_LENGTH) continue;
    if (digitsOf(typed) !== digitsOf(candidate)) continue;

    const allowed = Math.min(2, Math.max(1, Math.floor(typed.length * 0.15)));
    const distance = editDistance(typed, candidate);
    if (distance <= allowed && (!best || distance < best.distance)) {
      best = { name, distance };
    }
  }

  return best ? { kind: "near", name: best.name } : null;
}
