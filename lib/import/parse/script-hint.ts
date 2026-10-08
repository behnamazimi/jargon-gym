import type { CollectionLanguage } from "@/lib/terms/languages";

const KANA = /[぀-ヿㇰ-ㇿ]/gu;
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/gu;
const HAN = /[㐀-䶿一-鿿]/gu;
const CYRILLIC = /[Ѐ-ӿ]/gu;
const LETTER = /\p{L}/gu;

/** Fewer letters than this say nothing about the language. */
const MIN_LETTERS = 3;
/** Share of all letters a script needs to decide the language. */
const MIN_SHARE = 0.5;

function count(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/** Japanese, Korean, Chinese or Russian, read from the terms' script. Latin-script
 *  languages can't be told apart this way, so they return null. */
export function guessScriptLanguage(terms: string[]): CollectionLanguage | null {
  const text = terms.join(" ");
  const letters = count(text, LETTER);
  if (letters < MIN_LETTERS) return null;

  const kana = count(text, KANA);
  const han = count(text, HAN);
  const hangul = count(text, HANGUL);
  const cyrillic = count(text, CYRILLIC);

  if (kana > 0 && (kana + han) / letters >= MIN_SHARE) return "ja";
  if (hangul / letters >= MIN_SHARE) return "ko";
  if (han / letters >= MIN_SHARE) return "zh";
  if (cyrillic / letters >= MIN_SHARE) return "ru";
  return null;
}
