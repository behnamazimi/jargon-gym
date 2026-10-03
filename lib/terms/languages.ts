/**
 * Supported collection content languages. Single source of truth for the
 * domain edit form, domain-schema.ts's Zod enum, and narration's per-language
 * template/voice selection — add a new entry here (plus its narration
 * connector phrases, voice, and term-labels.ts labels) to support another
 * language.
 */
export type DomainLanguage = "en" | "nl";

export const DOMAIN_LANGUAGES = ["en", "nl"] as const satisfies readonly DomainLanguage[];

export const DOMAIN_LANGUAGE_OPTIONS: { value: DomainLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "nl", label: "Dutch" },
];

export function parseLanguage(value: string | null | undefined): DomainLanguage {
  return (DOMAIN_LANGUAGES as readonly string[]).includes(value ?? "")
    ? (value as DomainLanguage)
    : "en";
}
