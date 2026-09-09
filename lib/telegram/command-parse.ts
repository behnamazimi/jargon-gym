import type { QuizDomainSelection } from "./session-store";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedDomainCount = {
  domainId?: QuizDomainSelection;
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

/** A bare leading count (no domain token) implies domain "all". */
function parseLeadingCount(firstArg: string): ParsedDomainCount | null {
  if (!/^\d+$/.test(firstArg)) return null;
  const count = parseCountToken(firstArg);
  if (count === null) return { complete: false, error: "Invalid count." };
  return { domainId: "all", count, complete: true, error: null };
}

function parseDomainToken(firstArg: string, firstLower: string): QuizDomainSelection | null {
  if (firstLower === "all") return "all";
  if (UUID_RE.test(firstArg)) return firstArg;
  return null;
}

/** Parses "[all|<collection>] [count|all]" — shared by /quiz (no status token)
 *  and the tail of /review's grammar once its status token is consumed. */
export function parseDomainCountArgs(argsText: string, helpMessage: string): ParsedDomainCount {
  if (!argsText) {
    return { complete: false, error: null };
  }

  const args = argsText.split(/\s+/);
  const firstArg = args[0];
  const firstLower = firstArg.toLowerCase();

  const leading = parseLeadingCount(firstArg);
  if (leading) return leading;

  if (firstLower === "all" && args.length === 1) {
    return { domainId: "all", count: "all", complete: true, error: null };
  }

  const domainId = parseDomainToken(firstArg, firstLower);
  if (domainId === null) {
    return { complete: false, error: helpMessage };
  }

  if (args.length === 1) {
    return { domainId, complete: false, error: null };
  }

  const count = parseCountToken(args[1]);
  if (count === null) {
    return { domainId, complete: false, error: "Invalid count." };
  }

  return { domainId, count, complete: true, error: null };
}

export { UUID_RE };
