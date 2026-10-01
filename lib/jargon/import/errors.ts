import { jsonSyntaxMessage } from "./issue-messages";
import type { ImportFailure, ImportValidationIssue } from "./types";

export function jsonSyntaxFailure(error: string, raw: string): ImportFailure {
  return {
    title: "Check your JSON",
    message: jsonSyntaxMessage(error, raw),
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
