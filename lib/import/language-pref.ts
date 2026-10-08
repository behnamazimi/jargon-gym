import { parseLanguage, type CollectionLanguage } from "@/lib/terms/languages";

const KEY = "lobyas:import-language";

/** The language last used for a new collection on this device. */
export function readLanguagePref(): CollectionLanguage {
  try {
    return parseLanguage(window.localStorage.getItem(KEY));
  } catch {
    return "en";
  }
}

export function writeLanguagePref(language: CollectionLanguage): void {
  try {
    window.localStorage.setItem(KEY, language);
  } catch {
    // Not kept in private mode.
  }
}
