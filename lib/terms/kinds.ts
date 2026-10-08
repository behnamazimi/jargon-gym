import { COLLECTION_LANGUAGE_OPTIONS, type CollectionLanguage } from "@/lib/terms/languages";

/**
 * What a collection teaches: the terms of a field, or the words and phrases of
 * a language. Single source of truth for the admin control, the public pages
 * and parseKind; the database checks the same two values.
 */
export type CollectionKind = "terms" | "vocabulary";

export const COLLECTION_KINDS = [
  "terms",
  "vocabulary",
] as const satisfies readonly CollectionKind[];

export const COLLECTION_KIND_OPTIONS: { value: CollectionKind; label: string }[] = [
  { value: "terms", label: "Field terms" },
  { value: "vocabulary", label: "Words and phrases" },
];

export function kindLabel(kind: CollectionKind) {
  return COLLECTION_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind;
}

export function parseKind(value: string | null | undefined): CollectionKind {
  return (COLLECTION_KINDS as readonly string[]).includes(value ?? "")
    ? (value as CollectionKind)
    : "terms";
}

/** The line above a collection's name on public pages: "Field terms", "Dutch words and phrases". */
export function kindLine(kind: CollectionKind, language: CollectionLanguage): string {
  if (kind === "terms") return "Field terms";
  const label = COLLECTION_LANGUAGE_OPTIONS.find((option) => option.value === language)?.label;
  return label ? `${label} words and phrases` : "Words and phrases";
}

/** "59 terms", "1 term", "50 words and phrases", "1 word or phrase". */
export function countLabel(kind: CollectionKind, count: number): string {
  if (kind === "vocabulary")
    return `${count} ${count === 1 ? "word or phrase" : "words and phrases"}`;
  return `${count} ${count === 1 ? "term" : "terms"}`;
}
