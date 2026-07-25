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
      return "A unique constraint was violated. Check for duplicate term names in the domain.";
    case "23503":
      return "A referenced record is missing. Make sure relationship source/target terms exist.";
    case "42501":
      return "You do not have permission to write to this domain.";
    case "PGRST116":
      return "The requested row was not found or is not accessible.";
    default:
      return undefined;
  }
}

export function formatImportFailure(
  err: unknown,
  context?: { step?: string; term?: string; domain?: string },
): ImportFailure {
  if (err instanceof ImportExecutionError) {
    return err.failure;
  }

  if (isSupabaseLikeError(err)) {
    const code = err.code;
    const details = [err.details, err.hint].filter(Boolean) as string[];
    const hint = postgresCodeHint(code) ?? err.hint ?? undefined;

    return {
      title: context?.step ?? "Import failed",
      message: err.message ?? "The database rejected the import.",
      details: details.length > 0 ? details : undefined,
      hint,
      code,
      context: {
        term: context?.term,
        domain: context?.domain,
      },
    };
  }

  if (err instanceof Error) {
    return {
      title: context?.step ?? "Import failed",
      message: err.message,
      context: {
        term: context?.term,
        domain: context?.domain,
      },
    };
  }

  return {
    title: context?.step ?? "Import failed",
    message: "An unexpected error occurred during import.",
    context: {
      term: context?.term,
      domain: context?.domain,
    },
  };
}

export function jsonSyntaxFailure(message: string): ImportFailure {
  const positionMatch = message.match(/position\s+(\d+)/i);
  const position = positionMatch ? Number(positionMatch[1]) : undefined;

  return {
    title: "Invalid JSON",
    message: "The payload is not valid JSON.",
    details: [message],
    hint:
      position !== undefined
        ? `Check around character ${position} for a missing comma, quote, or bracket.`
        : "Use Format JSON or Load example to start from a valid template.",
  };
}

export function emptyPayloadFailure(): ImportFailure {
  return {
    title: "Empty payload",
    message: "Paste JSON or load an example before validating.",
    hint: "Use Load example to insert a starter payload.",
  };
}

export function validationFailure(issues: ImportValidationIssue[]): ImportFailure {
  return {
    title: "Validation failed",
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
