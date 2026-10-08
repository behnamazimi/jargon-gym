/**
 * Supported collection content languages. Single source of truth for the
 * collection edit form, collection-schema.ts's Zod enum, and narration's per-language
 * template/voice selection — add a new entry here (plus its narration
 * connector phrases, voice, and term-labels.ts labels) to support another
 * language. The database list lives in `public.is_supported_language`.
 */
export type CollectionLanguage =
  | "en"
  | "nl"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "ru"
  | "tr"
  | "ja"
  | "ko"
  | "zh";

export const COLLECTION_LANGUAGES = [
  "en",
  "nl",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "ru",
  "tr",
  "ja",
  "ko",
  "zh",
] as const satisfies readonly CollectionLanguage[];

export const COLLECTION_LANGUAGE_OPTIONS: { value: CollectionLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "nl", label: "Dutch" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Mandarin Chinese" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
  { value: "es", label: "Spanish" },
  { value: "tr", label: "Turkish" },
];

export function parseLanguage(value: string | null | undefined): CollectionLanguage {
  return (COLLECTION_LANGUAGES as readonly string[]).includes(value ?? "")
    ? (value as CollectionLanguage)
    : "en";
}
