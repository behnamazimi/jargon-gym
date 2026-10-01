import { jsonSyntaxMessage } from "./issue-messages";
import type { ImportFailure, ImportValidationIssue } from "./types";

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

export class ImportExecutionError extends Error {
  failure: ImportFailure;

  constructor(failure: ImportFailure) {
    super(failure.message);
    this.name = "ImportExecutionError";
    this.failure = failure;
  }
}

function isSupabaseLikeError(err: unknown): err is SupabaseLikeError {
  return (
    typeof err === "object" &&
    err !== null &&
    ("code" in err || "details" in err || "hint" in err || "message" in err)
  );
}

const GENERIC_STOP = "The import stopped part way. Some terms may already be added.";
const RETRY_HINT =
  "Check the collection, then try again. Terms that were added will be updated, not duplicated.";

type FailureContext = { step?: string; term?: string; domain?: string };

function contextTitle(context?: FailureContext): string {
  return context?.step ?? "Import didn't work";
}

function failureContext(context?: FailureContext) {
  return { term: context?.term, domain: context?.domain };
}

function stoppedMessage(context?: FailureContext): string {
  return context?.term
    ? `The import stopped at "${context.term}". Some terms before it may already be added.`
    : GENERIC_STOP;
}

function codeReason(code?: string): string | undefined {
  switch (code) {
    case "23505":
      return "A term or collection with that name already exists.";
    case "23503":
      return "A linked term is missing.";
    case "42501":
      return "You don't have permission to change this collection.";
    default:
      return undefined;
  }
}

function plainFailure(code: string | undefined, context?: FailureContext): ImportFailure {
  return {
    title: contextTitle(context),
    message: stoppedMessage(context),
    details: codeReason(code) ? [codeReason(code) as string] : undefined,
    hint: RETRY_HINT,
    context: failureContext(context),
  };
}

export function formatImportFailure(err: unknown, context?: FailureContext): ImportFailure {
  if (err instanceof ImportExecutionError) {
    return err.failure;
  }

  const code = isSupabaseLikeError(err) ? err.code : undefined;
  return plainFailure(code, context);
}

export function jsonSyntaxFailure(error: string, raw: string): ImportFailure {
  return {
    title: "Check your JSON",
    message: jsonSyntaxMessage(error, raw),
  };
}

export function emptyPayloadFailure(): ImportFailure {
  return {
    title: "Nothing to check yet",
    message: "Nothing to check yet. Paste JSON or choose a .json file.",
  };
}

const MAX_LISTED_ISSUES = 10;

export function validationFailure(issues: ImportValidationIssue[]): ImportFailure {
  const listed = issues.slice(0, MAX_LISTED_ISSUES);
  const hidden = issues.length - listed.length;

  return {
    title: "Fix these first",
    message:
      issues.length === 1 ? "Found 1 thing to fix." : `Found ${issues.length} things to fix.`,
    issues: hidden > 0 ? [...listed, { message: `…and ${hidden} more.` }] : listed,
    hint: "Fix the items below, then check again.",
  };
}
