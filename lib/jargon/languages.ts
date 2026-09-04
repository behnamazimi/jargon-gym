/**
 * Supported collection content languages. Single source of truth for the
 * domain edit form, domain-schema.ts's Zod enum, and narration's per-language
 * template/voice selection — add a new entry here (plus its narration
 * connector phrases and voice) to support another language.
 */
export type DomainLanguage = "en" | "nl";

export const DOMAIN_LANGUAGES = ["en", "nl"] as const satisfies readonly DomainLanguage[];

export const DOMAIN_LANGUAGE_OPTIONS: { value: DomainLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "nl", label: "Dutch" },
];
