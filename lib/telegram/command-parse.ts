import type { QuizDomainSelection, ReviewStatus } from "./session-store";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedDomainCount = {
  domainId?: QuizDomainSelection;
  count?: number | "all";
  complete: boolean;
  error: string | null;
};

/** Parses "[all|<collection>] [count|all]" — shared by /quiz (no status token)
 *  and the tail of /review's grammar once its status token is consumed. */
export function parseDomainCountArgs(argsText: string, helpMessage: string): ParsedDomainCount {
  if (!argsText) {
    return { complete: false, error: null };
  }

  const args = argsText.split(/\s+/);
  const firstArg = args[0];
  const firstLower = firstArg.toLowerCase();

  if (/^\d+$/.test(firstArg)) {
    const count = parseInt(firstArg, 10);
    if (isNaN(count) || count < 1) {
      return { complete: false, error: "Invalid count." };
    }
    return { domainId: "all", count, complete: true, error: null };
  }

  if (firstLower === "all" && args.length === 1) {
    return { domainId: "all", count: "all", complete: true, error: null };
  }

  let domainId: QuizDomainSelection;
  if (firstLower === "all") {
    domainId = "all";
  } else if (UUID_RE.test(firstArg)) {
    domainId = firstArg;
  } else {
    return { complete: false, error: helpMessage };
  }

  if (args.length === 1) {
    return { domainId, complete: false, error: null };
  }

  const countArg = args[1].toLowerCase();
  if (countArg === "all") {
    return { domainId, count: "all", complete: true, error: null };
  }

  const count = parseInt(countArg, 10);
  if (isNaN(count) || count < 1) {
    return { domainId, complete: false, error: "Invalid count." };
  }

  return { domainId, count, complete: true, error: null };
}

export type ParsedStatusDomainCount = {
  status?: ReviewStatus;
  domainId?: QuizDomainSelection;
  count?: number | "all";
  complete: boolean;
  error: string | null;
};

/** Parses "[known|unknown] [all|<collection>] [count|all]" args for /review. */
export function parseStatusDomainCountArgs(
  argsText: string,
  helpMessage: string,
): ParsedStatusDomainCount {
  if (!argsText) {
    return { complete: false, error: null };
  }

  const args = argsText.split(/\s+/);
  const firstArg = args[0].toLowerCase();

  if (/^\d+$/.test(firstArg)) {
    const count = parseInt(firstArg, 10);
    if (isNaN(count) || count < 1) {
      return { complete: false, error: "Invalid count." };
    }
    return {
      status: "unknown",
      domainId: "all",
      count,
      complete: true,
      error: null,
    };
  }

  if (firstArg === "all" && args.length === 1) {
    return {
      status: "unknown",
      domainId: "all",
      count: "all",
      complete: true,
      error: null,
    };
  }

  if (firstArg !== "known" && firstArg !== "unknown") {
    return { complete: false, error: helpMessage };
  }

  const status = firstArg as ReviewStatus;
  const rest = args.slice(1).join(" ");

  if (!rest) {
    return { status, complete: false, error: null };
  }

  const restParsed = parseDomainCountArgs(rest, helpMessage);
  return { status, ...restParsed };
}

export { UUID_RE };
