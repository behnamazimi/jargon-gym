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

function postgresCodeHint(code?: string): string | undefined {
  switch (code) {
    case "23505":
      return "Looks like a duplicate term name in this collection.";
    case "23503":
      return "A linked term is missing. Make sure relationship source and target terms exist.";
    case "42501":
      return "You don't have permission to write to this collection.";
    case "PGRST116":
      return "That record wasn't found or isn't accessible.";
    default:
      return undefined;
  }
}

type FailureContext = { step?: string; term?: string; domain?: string };

function contextTitle(context?: FailureContext): string {
  return context?.step ?? "Import didn't work";
}

function failureContext(context?: FailureContext) {
  return { term: context?.term, domain: context?.domain };
}

function supabaseFailure(err: SupabaseLikeError, context?: FailureContext): ImportFailure {
  const details = [err.details, err.hint].filter(Boolean) as string[];
  const hint = postgresCodeHint(err.code) ?? err.hint ?? undefined;

  return {
    title: contextTitle(context),
    message: err.message ?? "The database rejected this import.",
    details: details.length > 0 ? details : undefined,
    hint,
    code: err.code,
    context: failureContext(context),
  };
}

function errorFailure(err: Error, context?: FailureContext): ImportFailure {
  return {
    title: contextTitle(context),
    message: err.message,
    context: failureContext(context),
  };
}

function unknownFailure(context?: FailureContext): ImportFailure {
  return {
    title: contextTitle(context),
    message: "Something unexpected happened during import.",
    context: failureContext(context),
  };
}

export function formatImportFailure(err: unknown, context?: FailureContext): ImportFailure {
  if (err instanceof ImportExecutionError) {
    return err.failure;
  }

  if (isSupabaseLikeError(err)) {
    return supabaseFailure(err, context);
  }

  if (err instanceof Error) {
    return errorFailure(err, context);
  }

  return unknownFailure(context);
}

export function jsonSyntaxFailure(message: string): ImportFailure {
  const positionMatch = message.match(/position\s+(\d+)/i);
  const position = positionMatch ? Number(positionMatch[1]) : undefined;

  return {
    title: "Check your JSON",
    message: "This isn't valid JSON.",
    details: [message],
    hint:
      position !== undefined
        ? `Check around character ${position} for a missing comma, quote, or bracket.`
        : "Use Format JSON or Load example to start from a valid template.",
  };
}

export function emptyPayloadFailure(): ImportFailure {
  return {
    title: "Nothing to import",
    message: "Paste JSON or load an example first.",
    hint: "Use Load example to insert a starter payload.",
  };
}

export function validationFailure(issues: ImportValidationIssue[]): ImportFailure {
  return {
    title: "Fix these issues",
    message:
      issues.length === 1
        ? "Found 1 issue in the payload."
        : `Found ${issues.length} issues in the payload.`,
    issues,
    hint: "Fix the paths listed below, then validate again.",
  };
}

export function formatJsonFailure(message: string): ImportFailure {
  return jsonSyntaxFailure(message);
}
