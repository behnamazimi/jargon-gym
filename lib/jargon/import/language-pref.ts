import { parseLanguage, type DomainLanguage } from "@/lib/jargon/languages";

const KEY = "jargon-gym:import-language";

/** The language last used for a new collection on this device. */
export function readLanguagePref(): DomainLanguage {
  try {
    return parseLanguage(window.localStorage.getItem(KEY));
  } catch {
    return "en";
  }
}

export function writeLanguagePref(language: DomainLanguage): void {
  try {
    window.localStorage.setItem(KEY, language);
  } catch {
    // Not kept in private mode.
  }
}
