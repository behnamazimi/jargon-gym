import { parseCollectionCountArgs, type ParsedCollectionCount } from "./command-parse";
import { REVIEW_HELP_MESSAGE } from "./copy";

export type ParsedReviewCommand = ParsedCollectionCount;

export function parseReviewCommand(text: string): ParsedReviewCommand {
  const match = text.match(/^\/review(?:@\w+)?(?:\s+(.+))?$/i);
  const argsText = match?.[1]?.trim() ?? "";
  return parseCollectionCountArgs(argsText, REVIEW_HELP_MESSAGE);
}
