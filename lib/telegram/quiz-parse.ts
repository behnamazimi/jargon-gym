import { parseDomainCountArgs, type ParsedDomainCount } from "./command-parse";
import { QUIZ_HELP_MESSAGE } from "./copy";

/** /quiz is known-pool only — no status token, unlike /review's grammar. */
export type ParsedQuizCommand = ParsedDomainCount;

/** Parses "[all|<collection>] [count|all]" args for /quiz. */
export function parseQuizCommand(text: string): ParsedQuizCommand {
  const match = text.match(/^\/quiz(?:@\w+)?(?:\s+(.+))?$/i);
  const argsText = match?.[1]?.trim() ?? "";
  return parseDomainCountArgs(argsText, QUIZ_HELP_MESSAGE);
}

export { UUID_RE } from "./command-parse";
