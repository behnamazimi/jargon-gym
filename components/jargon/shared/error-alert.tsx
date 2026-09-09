import { AlertCircle } from "lucide-react";
import { Alert, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert";

type JargonErrorIssue = {
  path: string;
  message: string;
  expected?: string;
  received?: string;
};

type JargonErrorContext = {
  term?: string;
  domain?: string;
};

type JargonErrorDetails = {
  title?: string;
  message: string;
  details?: string[];
  hint?: string;
  code?: string;
  issues?: JargonErrorIssue[];
  context?: JargonErrorContext;
};

type JargonErrorAlertProps = {
  error: string | JargonErrorDetails;
  className?: string;
};

function ErrorContext({ context }: { context: JargonErrorContext | undefined }) {
  if (!context?.domain && !context?.term) return null;
  return (
    <dl className="mt-3 grid gap-1.5 rounded-lg bg-error/5 px-3 py-2.5 ring-1 ring-error/15">
      {context.domain ? (
        <div className="flex gap-2 text-sm">
          <dt className="text-base-content/60">Collection</dt>
          <dd className="font-medium">{context.domain}</dd>
        </div>
      ) : null}
      {context.term ? (
        <div className="flex gap-2 text-sm">
          <dt className="text-base-content/60">Term</dt>
          <dd className="font-medium">{context.term}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function ErrorDetailsList({ details }: { details: string[] | undefined }) {
  if (!details || details.length === 0) return null;
  return (
    <ul className="mt-3 list-disc space-y-1 pl-5">
      {details.map((detail) => (
        <li key={detail}>{detail}</li>
      ))}
    </ul>
  );
}

function IssueExpectedReceived({ issue }: { issue: JargonErrorIssue }) {
  if (!issue.expected && !issue.received) return null;
  return (
    <div className="mt-1 text-xs text-base-content/60">
      {issue.expected ? `Expected: ${issue.expected}` : null}
      {issue.expected && issue.received ? " · " : null}
      {issue.received ? `Received: ${issue.received}` : null}
    </div>
  );
}

function ErrorIssuesList({ issues }: { issues: JargonErrorIssue[] | undefined }) {
  if (!issues || issues.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2">
      {issues.map((issue) => (
        <li
          key={`${issue.path}-${issue.message}`}
          className="rounded-lg bg-base-100/70 px-3 py-2.5 ring-1 ring-base-content/10"
        >
          <div className="font-mono text-xs break-all text-base-content/60">{issue.path}</div>
          <div className="mt-0.5">{issue.message}</div>
          <IssueExpectedReceived issue={issue} />
        </li>
      ))}
    </ul>
  );
}

function ErrorHint({ hint }: { hint: string | undefined }) {
  if (!hint) return null;
  return (
    <p className="mt-3 rounded-lg bg-base-100/50 px-3 py-2.5 text-sm ring-1 ring-base-content/10">
      <span className="font-medium">Hint:</span> {hint}
    </p>
  );
}

// One error-display component for the whole app: a plain string renders as a
// simple destructive alert, a full JargonErrorDetails renders with an
// optional title, context, code, details list, issue list, and hint.
export function JargonErrorAlert({ error, className }: JargonErrorAlertProps) {
  const failure: JargonErrorDetails = typeof error === "string" ? { message: error } : error;

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="stroke-current h-5 w-5 shrink-0" strokeWidth={1.5} />
      <AlertContent>
        {failure.title ? <AlertTitle>{failure.title}</AlertTitle> : null}
        <AlertDescription>
          <p>{failure.message}</p>
          <ErrorContext context={failure.context} />
          {failure.code ? (
            <p className="mt-2 font-mono text-xs opacity-80">Error code: {failure.code}</p>
          ) : null}
          <ErrorDetailsList details={failure.details} />
          <ErrorIssuesList issues={failure.issues} />
          <ErrorHint hint={failure.hint} />
        </AlertDescription>
      </AlertContent>
    </Alert>
  );
}
