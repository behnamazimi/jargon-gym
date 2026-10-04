import { Heart } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import type { Domain } from "@/lib/terms/types";
import { pluralize } from "@/lib/utils";

export function DomainMeta({ domain, categoryCount }: { domain: Domain; categoryCount: number }) {
  const parts: ReactNode[] = [];

  if (domain.source === "owned") {
    if (domain.visibility === "shared") {
      parts.push("Shared");
      parts.push(
        <span key="loves" className="inline-flex items-center gap-1 tabular-nums">
          <Heart className="size-3.5 fill-error text-error" aria-hidden strokeWidth={1.5} />
          <span className="sr-only">Loves: </span>
          {domain.loveCount}
        </span>,
      );
    }
  } else {
    parts.push("Added");
  }

  if (domain.termCount === 0) parts.push(pluralize(0, "term"));
  if (categoryCount > 0) parts.push(pluralize(categoryCount, "category", "categories"));

  return (
    <div className="min-w-0 flex-1 space-y-2">
      {domain.description ? (
        <p className="max-w-prose text-base text-base-content/85">{domain.description}</p>
      ) : null}
      <p className="m-0 flex flex-wrap items-center gap-x-1.5 text-xs text-base-content/70">
        {parts.map((part, index) => (
          <Fragment key={index}>
            {index > 0 ? <span aria-hidden>·</span> : null}
            {part}
          </Fragment>
        ))}
      </p>
    </div>
  );
}
