import type { ImportFailure } from "@/lib/jargon/import/types";

type ImportFailurePanelProps = {
  failure: ImportFailure;
};

export function ImportFailurePanel({ failure }: ImportFailurePanelProps) {
  return (
    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
      <h2 className="m-0 text-[15px] font-semibold">{failure.title}</h2>
      <p className="mt-1 text-[13px]">{failure.message}</p>

      {failure.context?.domain || failure.context?.term ? (
        <dl className="mt-3 grid gap-1 text-[13px]">
          {failure.context.domain ? (
            <div className="flex gap-2">
              <dt className="text-red-700">Domain</dt>
              <dd className="font-medium">{failure.context.domain}</dd>
            </div>
          ) : null}
          {failure.context.term ? (
            <div className="flex gap-2">
              <dt className="text-red-700">Term</dt>
              <dd className="font-medium">{failure.context.term}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {failure.code ? (
        <p className="mt-2 font-mono text-[12px] text-red-700">Code: {failure.code}</p>
      ) : null}

      {failure.details && failure.details.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px]">
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
              className="rounded-md border border-red-200 bg-white/70 px-3 py-2 text-[13px]"
            >
              <div className="font-mono text-[12px] text-red-700">{issue.path}</div>
              <div className="mt-0.5">{issue.message}</div>
              {issue.expected || issue.received ? (
                <div className="mt-1 text-[12px] text-red-700">
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
        <p className="mt-3 text-[13px] text-red-800">
          <span className="font-medium">Hint:</span> {failure.hint}
        </p>
      ) : null}
    </div>
  );
}
