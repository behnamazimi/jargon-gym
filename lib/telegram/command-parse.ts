import type { QuizDomainSelection, ReviewStatus } from "./session-store";

export type ParsedStatusDomainCount = {
  status?: ReviewStatus;
  domainId?: QuizDomainSelection;
  count?: number | "all";
  complete: boolean;
  error: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Parses "[known|unknown] [all|<collection>] [count|all]" args shared by /quiz and /review. */
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

  if (args.length === 1) {
    return { status, complete: false, error: null };
  }

  const secondArg = args[1];
  const secondLower = secondArg.toLowerCase();
  let domainId: QuizDomainSelection;
  const countArgIndex = 2;

  if (secondLower === "all") {
    domainId = "all";
  } else if (UUID_RE.test(secondArg)) {
    domainId = secondArg;
  } else if (/^\d+$/.test(secondArg)) {
    const count = parseInt(secondArg, 10);
    if (isNaN(count) || count < 1) {
      return { status, domainId: "all", complete: false, error: "Invalid count." };
    }
    return { status, domainId: "all", count, complete: true, error: null };
  } else {
    return { complete: false, error: helpMessage };
  }

  if (args.length <= countArgIndex) {
    return { status, domainId, complete: false, error: null };
  }

  const countArg = args[countArgIndex].toLowerCase();
  if (countArg === "all") {
    return { status, domainId, count: "all", complete: true, error: null };
  }

  const count = parseInt(countArg, 10);
  if (isNaN(count) || count < 1) {
    return { status, domainId, complete: false, error: "Invalid count." };
  }

  return { status, domainId, count, complete: true, error: null };
}

export { UUID_RE };
