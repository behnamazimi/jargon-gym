import { APICallError, RetryError } from "ai";

const MAX_LENGTH = 200;

/** One line with anything that looks like a key removed, and no more than a few
 *  hundred characters. Provider messages don't normally carry keys or prompts,
 *  but this is stored, so it errs on the side of caution. */
function tidy(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/([?&]key=)[^&\s"']+/gi, "$1[removed]")
    .replace(/\b(?:AIza[\w-]{20,}|sk-[\w-]{16,}|Bearer\s+[\w.-]{16,})/g, "[removed]")
    .trim()
    .slice(0, MAX_LENGTH);
}

/** A short reason a request failed, kept on the refund so admins can see why. */
export function describeFailure(error: unknown): string {
  const inner = RetryError.isInstance(error) ? error.lastError : error;

  if (APICallError.isInstance(inner)) {
    const status = inner.statusCode ? `${inner.statusCode}` : "no status";
    return tidy(`Provider error ${status}: ${inner.message}`);
  }
  if (inner instanceof Error) return tidy(`${inner.name}: ${inner.message}`);
  return "Unknown error";
}
