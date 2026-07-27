import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ImportFailure } from "@/lib/jargon/import/types";

type ImportFailurePanelProps = {
  failure: ImportFailure;
};

export function ImportFailurePanel({ failure }: ImportFailurePanelProps) {
  return (
    <Alert variant="destructive">
      <AlertTitle className="text-base font-semibold">{failure.title}</AlertTitle>
      <AlertDescription className="text-sm">
        <p className="mt-1">{failure.message}</p>

        {failure.context?.domain || failure.context?.term ? (
          <dl className="mt-3 grid gap-1">
            {failure.context.domain ? (
              <div className="flex gap-2">
                <dt>Domain</dt>
                <dd className="font-medium">{failure.context.domain}</dd>
              </div>
            ) : null}
            {failure.context.term ? (
              <div className="flex gap-2">
                <dt>Term</dt>
                <dd className="font-medium">{failure.context.term}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {failure.code ? (
          <p className="mt-2 font-mono text-[12px] opacity-80">Code: {failure.code}</p>
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
                className="rounded-md border border-base-300 bg-base-100/70 px-3 py-2"
              >
                <div className="font-mono text-[12px] opacity-80">{issue.path}</div>
                <div className="mt-0.5">{issue.message}</div>
                {issue.expected || issue.received ? (
                  <div className="mt-1 text-[12px] opacity-80">
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
          <p className="mt-3">
            <span className="font-medium">Hint:</span> {failure.hint}
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
