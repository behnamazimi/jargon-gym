import { AlertCircle } from "lucide-react";
import { Alert, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ImportFailure } from "@/lib/jargon/import/types";

type ImportFailurePanelProps = {
  failure: ImportFailure;
};

export function ImportFailurePanel({ failure }: ImportFailurePanelProps) {
  return (
    <Alert variant="destructive" className="shadow-surface rounded-2xl">
      <AlertCircle className="stroke-current h-6 w-6 shrink-0" strokeWidth={1.5} />
      <AlertContent>
        <AlertTitle>{failure.title}</AlertTitle>
        <AlertDescription>
          <p>{failure.message}</p>

          {failure.context?.domain || failure.context?.term ? (
            <dl className="mt-3 grid gap-1.5 rounded-lg bg-error/5 px-3 py-2.5 ring-1 ring-error/15">
              {failure.context.domain ? (
                <div className="flex gap-2 text-sm">
                  <dt className="text-base-content/60">Collection</dt>
                  <dd className="font-medium">{failure.context.domain}</dd>
                </div>
              ) : null}
              {failure.context.term ? (
                <div className="flex gap-2 text-sm">
                  <dt className="text-base-content/60">Term</dt>
                  <dd className="font-medium">{failure.context.term}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {failure.code ? (
            <p className="mt-2 font-mono text-xs opacity-80">Error code: {failure.code}</p>
          ) : null}

          {failure.details && failure.details.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {failure.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}

          {failure.issues && failure.issues.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {failure.issues.map((issue) => (
                <li
                  key={`${issue.path}-${issue.message}`}
                  className="rounded-lg bg-base-100/70 px-3 py-2.5 ring-1 ring-base-content/10"
                >
                  <div className="font-mono text-xs break-all text-base-content/60">
                    {issue.path}
                  </div>
                  <div className="mt-0.5">{issue.message}</div>
                  {issue.expected || issue.received ? (
                    <div className="mt-1 text-xs text-base-content/60">
                      {issue.expected ? `Expected: ${issue.expected}` : null}
                      {issue.expected && issue.received ? " · " : null}
                      {issue.received ? `Received: ${issue.received}` : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {failure.hint ? (
            <p className="mt-3 rounded-lg bg-base-100/50 px-3 py-2.5 text-sm ring-1 ring-base-content/10">
              <span className="font-medium">Hint:</span> {failure.hint}
            </p>
          ) : null}
        </AlertDescription>
      </AlertContent>
    </Alert>
  );
}
