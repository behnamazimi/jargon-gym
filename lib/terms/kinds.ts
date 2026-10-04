/**
 * What a collection teaches: the terms of a field, or the words and phrases of
 * a language. Single source of truth for the admin control and parseKind; the
 * database checks the same two values.
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

export function parseKind(value: string | null | undefined): CollectionKind {
  return (COLLECTION_KINDS as readonly string[]).includes(value ?? "")
    ? (value as CollectionKind)
    : "terms";
}
