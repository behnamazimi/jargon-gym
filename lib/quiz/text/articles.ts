import type { CollectionLanguage } from "@/lib/terms/languages";

/** Articles a term can start with, per language. Languages without articles
 *  are left out. */
const ARTICLES: Partial<Record<CollectionLanguage, readonly string[]>> = {
  en: ["the", "a", "an"],
  nl: ["de", "het", "een", "'t"],
  es: ["el", "la", "los", "las", "un", "una", "unos", "unas"],
  fr: ["le", "la", "les", "un", "une", "des"],
  de: ["der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines"],
  it: ["il", "lo", "la", "i", "gli", "le", "un", "uno", "una"],
  pt: ["o", "a", "os", "as", "um", "uma", "uns", "umas"],
};

/** The term without its leading article ("het geval" → "geval"), or null when
 *  it doesn't start with one. */
export function withoutArticle(term: string, language: CollectionLanguage): string | null {
  const [first, ...rest] = term.trim().split(/\s+/);
  if (!first || rest.length === 0) return null;
  const articles = ARTICLES[language] ?? [];
  return articles.includes(first.toLowerCase()) ? rest.join(" ") : null;
}
