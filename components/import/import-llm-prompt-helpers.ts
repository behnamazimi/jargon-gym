export const INSTALL_COMMAND =
  "npx skills add https://github.com/behnamazimi/skills --skill lobyas-generator";

export const NEW_COLLECTION_KEY = "new";
export const DEFAULT_COUNT = 100;
const MIN_COUNT = 1;
const MAX_COUNT = 100;

export function buildRunCommand(collection: string, countRaw: string, excludeRaw: string) {
  const collectionPart = collection.trim() || "[collection]";

  const trimmedCount = countRaw.trim();
  const parsedCount = Number.parseInt(trimmedCount, 10);
  const count =
    trimmedCount === ""
      ? DEFAULT_COUNT
      : Number.isFinite(parsedCount) && parsedCount >= MIN_COUNT && parsedCount <= MAX_COUNT
        ? parsedCount
        : DEFAULT_COUNT;

  const excludeTerms = excludeRaw
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);

  const parts = [collectionPart, String(count)];
  if (excludeTerms.length > 0) {
    parts.push(`exclude: ${excludeTerms.join(", ")}`);
  }

  return `/lobyas-generator ${parts.join(" | ")}`;
}
