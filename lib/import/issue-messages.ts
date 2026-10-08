import type { ImportValidationIssue } from "./types";

type ZodIssueLike = { path: PropertyKey[]; code?: string };

const OPTIONAL_FIELD_LABELS: Record<string, string> = {
  example: "example",
  mental_model: "mental model",
  discussion: "in practice",
  anti_example: "anti-example",
  controversy: "debated",
  note: "note",
};

const REQUIRED_FIELD_LABELS: Record<string, string> = {
  category: "category",
  definition: "definition",
};

const RELATIONSHIP_FIELD_LABELS: Record<string, string> = {
  source: "first term",
  target: "second term",
  relationship_type: "type",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function termLabel(raw: unknown, index: number): string {
  const terms = isRecord(raw) && Array.isArray(raw.terms) ? raw.terms : [];
  const item = terms[index];
  const name = isRecord(item) && typeof item.term === "string" ? item.term.trim() : "";
  return name ? `"${name}"` : `Term ${index + 1}`;
}

function termValue(raw: unknown, index: number, field: string): unknown {
  const terms = isRecord(raw) && Array.isArray(raw.terms) ? raw.terms : [];
  const item = terms[index];
  return isRecord(item) ? item[field] : undefined;
}

function termIssueMessage(index: number, field: string | undefined, raw: unknown): string {
  const label = termLabel(raw, index);

  if (field === undefined) {
    return `${label} should have a name and a definition.`;
  }
  if (field === "term") {
    return `Term ${index + 1} has no name.`;
  }

  const required = REQUIRED_FIELD_LABELS[field];
  const value = termValue(raw, index, field);
  const isMissing = value === undefined || value === null || typeof value === "string";
  if (required && isMissing) {
    return `${label} needs a ${required}.`;
  }

  const name = required ?? OPTIONAL_FIELD_LABELS[field] ?? field;
  return `${label}: ${name} should be text.`;
}

function relationshipIssueMessage(index: number, field: string | undefined): string {
  const name = field ? RELATIONSHIP_FIELD_LABELS[field] : undefined;
  return name
    ? `Link ${index + 1} is missing its ${name}.`
    : `Link ${index + 1} should name two terms and a type.`;
}

function describeIssue(issue: ZodIssueLike, raw: unknown): string {
  const [root, index, field] = issue.path;

  if (issue.path.length === 0) {
    return "This doesn't look like a collection. It should start with { and list your terms.";
  }
  if (root === "domain") {
    return 'Add a collection name, like "domain": "Startup finance".';
  }
  if (root === "terms" && index === undefined) {
    const hasList = isRecord(raw) && Array.isArray(raw.terms);
    return hasList
      ? "There are no terms in this file. Add at least one."
      : 'Add a "terms" list with at least one term.';
  }
  if (root === "terms" && typeof index === "number") {
    return termIssueMessage(index, typeof field === "string" ? field : undefined, raw);
  }
  if (root === "relationships" && typeof index === "number") {
    return relationshipIssueMessage(index, typeof field === "string" ? field : undefined);
  }
  if (root === "relationships") {
    return 'The "relationships" part should be a list of links.';
  }

  return "Something in this file isn't in the expected format.";
}

export function describeZodIssues(issues: ZodIssueLike[], raw: unknown): ImportValidationIssue[] {
  const messages = new Set(issues.map((issue) => describeIssue(issue, raw)));
  return [...messages].map((message) => ({ message }));
}

function lineAndColumn(text: string, position: number) {
  const before = text.slice(0, position);
  const line = before.split("\n").length;
  const column = position - before.lastIndexOf("\n");
  return { line, column };
}

/** Newer engines sometimes report a text snippet instead of a position. */
function positionFromSnippet(error: string, text: string): number | null {
  const token = error.match(/Unexpected token '([\s\S])'/)?.[1];
  const snippet = error.match(/"([\s\S]*?)"(?:\.\.\.)? is not valid JSON/)?.[1];
  if (!token || !snippet) return null;

  const start = text.indexOf(snippet);
  const offset = snippet.indexOf(token);
  return start === -1 || offset === -1 ? null : start + offset;
}

export function jsonSyntaxMessage(error: string, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return "This doesn't look like JSON. It should start with { and list your terms.";
  }

  const positionMatch = error.match(/position\s+(\d+)/i);
  const lineMatch = error.match(/line\s+(\d+)\s+column\s+(\d+)/i);

  if (lineMatch) {
    return `Couldn't read this as JSON. Look near line ${lineMatch[1]}, column ${lineMatch[2]} for a missing comma, quote or bracket.`;
  }
  const position = positionMatch ? Number(positionMatch[1]) : positionFromSnippet(error, trimmed);
  if (position !== null) {
    const { line, column } = lineAndColumn(trimmed, position);
    return `Couldn't read this as JSON. Look near line ${line}, column ${column} for a missing comma, quote or bracket.`;
  }
  return "Couldn't read this as JSON. Look for a missing comma, quote or bracket.";
}
