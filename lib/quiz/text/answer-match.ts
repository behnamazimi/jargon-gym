export function normalizeAnswer(text: string): string {
  return text.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function matchesAnswer(text: string, acceptedAnswers: string[]): boolean {
  const typed = normalizeAnswer(text);
  return typed.length > 0 && acceptedAnswers.some((answer) => normalizeAnswer(answer) === typed);
}

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "");
}

function dropFirstWord(text: string): string {
  const words = text.split(" ");
  return words.length > 1 ? words.slice(1).join(" ") : text;
}

export type CloseMiss = "accents" | "article";

/** Why a wrong answer was still close: right letters with different accents, or
 *  the same words with the leading article added or dropped. */
export function closeMiss(text: string, acceptedAnswers: string[]): CloseMiss | null {
  const typed = normalizeAnswer(text);
  if (!typed) return null;

  for (const answer of acceptedAnswers.map(normalizeAnswer)) {
    if (stripAccents(typed) === stripAccents(answer)) return "accents";
    if (dropFirstWord(typed) === answer || typed === dropFirstWord(answer)) return "article";
  }
  return null;
}
