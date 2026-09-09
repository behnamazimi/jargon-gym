import type { Domain } from "@/lib/jargon/types";
import { pluralize } from "@/lib/utils";

export function DomainMeta({ domain, categoryCount }: { domain: Domain; categoryCount: number }) {
  const parts: string[] = [];

  if (domain.source === "owned") {
    if (domain.visibility === "shared") parts.push("Shared");
  } else {
    parts.push("Added");
  }

  if (!domain.isActiveForReview) parts.push("Paused");

  parts.push(pluralize(domain.termCount, "term"));
  parts.push(pluralize(categoryCount, "category", "categories"));

  return (
    <div className="min-w-0 flex-1 space-y-2">
      {domain.description ? (
        <p className="max-w-prose text-base leading-relaxed text-base-content/85">
          {domain.description}
        </p>
      ) : null}
      <p className="m-0 text-xs text-base-content/60">{parts.join(" · ")}</p>
    </div>
  );
}
