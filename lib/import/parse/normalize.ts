import { cleanText } from "@/lib/terms/text-clean";

const ZERO_WIDTH = /\u200B|\u200C|\u200D|\u2060|\uFEFF/g;

/** Makes pasted text predictable: one line ending, plain spaces, no hidden
 *  characters. Smart quotes and apostrophes are left alone. */
export function normalizeText(text: string): string {
  return cleanText(text)
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(ZERO_WIDTH, "")
    .replace(/[ \t]+$/gm, "");
}
