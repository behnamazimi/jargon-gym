"use client";

import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const quietButtonClass =
  "btn btn-ghost btn-xs font-normal text-base-content/60 hover:text-base-content";

/** The blocks a learner moved under "More", with a quiet row below the body:
 *  Customize, and More when there is something to open. The row stays put
 *  while the hidden blocks open above it. A new card starts collapsed
 *  because callers key the body by term. */
export function TermMoreFooter({
  count,
  customize,
  children,
}: {
  count: number;
  customize?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Collapsible
      isExpanded={expanded}
      onExpandedChange={setExpanded}
      className="flex flex-col gap-4"
    >
      <CollapsibleContent>
        <div className="flex flex-col gap-4">{children}</div>
      </CollapsibleContent>
      <div className="-ms-2 flex items-center gap-1">
        {customize}
        {count > 0 ? (
          <CollapsibleTrigger className={quietButtonClass}>
            {expanded ? "Less" : `More (${count})`}
          </CollapsibleTrigger>
        ) : null}
      </div>
    </Collapsible>
  );
}
