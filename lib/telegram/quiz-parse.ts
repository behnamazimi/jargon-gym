import { parseStatusDomainCountArgs, UUID_RE, type ParsedStatusDomainCount } from "./command-parse";
import { QUIZ_HELP_MESSAGE } from "./copy";

export type ParsedQuizCommand = ParsedStatusDomainCount;

export function parseQuizCommand(text: string): ParsedQuizCommand {
  const match = text.match(/^\/quiz(?:@\w+)?(?:\s+(.+))?$/i);
  const argsText = match?.[1]?.trim() ?? "";
  return parseStatusDomainCountArgs(argsText, QUIZ_HELP_MESSAGE);
}

export { UUID_RE };
