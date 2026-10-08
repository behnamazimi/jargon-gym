/**
 * Supported collection content languages. Single source of truth for the
 * domain edit form, domain-schema.ts's Zod enum, and narration's per-language
 * template/voice selection — add a new entry here (plus its narration
 * connector phrases, voice, and term-labels.ts labels) to support another
 * language. The database list lives in `public.is_supported_language`.
 */
export type DomainLanguage =
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

export const DOMAIN_LANGUAGES = [
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
] as const satisfies readonly DomainLanguage[];

export const DOMAIN_LANGUAGE_OPTIONS: { value: DomainLanguage; label: string }[] = [
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

export function parseLanguage(value: string | null | undefined): DomainLanguage {
  return (DOMAIN_LANGUAGES as readonly string[]).includes(value ?? "")
    ? (value as DomainLanguage)
    : "en";
}
