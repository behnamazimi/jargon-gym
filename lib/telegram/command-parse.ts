import type { QuizCollectionSelection } from "./session-store";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedCollectionCount = {
  collectionId?: QuizCollectionSelection;
  count?: number | "all";
  complete: boolean;
  error: string | null;
};

/** "all" or a positive integer; null means the token is invalid. */
function parseCountToken(token: string): number | "all" | null {
  if (token.toLowerCase() === "all") return "all";
  const count = parseInt(token, 10);
  if (isNaN(count) || count < 1) return null;
  return count;
}

/** A bare leading count (no collection token) implies collection "all". */
function parseLeadingCount(firstArg: string): ParsedCollectionCount | null {
  if (!/^\d+$/.test(firstArg)) return null;
  const count = parseCountToken(firstArg);
  if (count === null) return { complete: false, error: "Invalid count." };
  return { collectionId: "all", count, complete: true, error: null };
}

function parseCollectionToken(
  firstArg: string,
  firstLower: string,
): QuizCollectionSelection | null {
  if (firstLower === "all") return "all";
  if (UUID_RE.test(firstArg)) return firstArg;
  return null;
}

/** Parses "[all|<collection>] [count|all]" — shared by /quiz (no status token)
 *  and the tail of /review's grammar once its status token is consumed. */
export function parseCollectionCountArgs(
  argsText: string,
  helpMessage: string,
): ParsedCollectionCount {
  if (!argsText) {
    return { complete: false, error: null };
  }

  const args = argsText.split(/\s+/);
  const firstArg = args[0];
  const firstLower = firstArg.toLowerCase();

  const leading = parseLeadingCount(firstArg);
  if (leading) return leading;

  if (firstLower === "all" && args.length === 1) {
    return { collectionId: "all", count: "all", complete: true, error: null };
  }

  const collectionId = parseCollectionToken(firstArg, firstLower);
  if (collectionId === null) {
    return { complete: false, error: helpMessage };
  }

  if (args.length === 1) {
    return { collectionId, complete: false, error: null };
  }

  const count = parseCountToken(args[1]);
  if (count === null) {
    return { collectionId, complete: false, error: "Invalid count." };
  }

  return { collectionId, count, complete: true, error: null };
}

export { UUID_RE };
