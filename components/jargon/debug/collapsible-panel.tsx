"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/** A QuizPanelHeader that doubles as a disclosure trigger — same icon-chip
 *  + title + description layout, plus a chevron that rotates on expand.
 *  Mirrors ScoreRow's exact controlled-Collapsible pattern (isExpanded/
 *  onExpandedChange local state, duration-200 ease-out rotate, disabled
 *  under prefers-reduced-motion) so every disclosure on this page animates
 *  the same way.
 *
 *  `icon` takes an already-rendered element (`<Clock .../>`), not a
 *  component reference — this file is a Client Component (needs local
 *  expand/collapse state), and its callers are Server Components. A bare
 *  icon component is a function and can't cross that boundary as a prop;
 *  a rendered element can, the same way `children` always can. */
export function CollapsiblePanel({
  icon,
  title,
  description,
  defaultExpanded = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Collapsible isExpanded={expanded} onExpandedChange={setExpanded}>
      <CollapsibleTrigger
        className="flex w-full items-center gap-4 border-0 bg-transparent px-5 py-5 text-left sm:px-6"
        aria-expanded={expanded}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="m-0 text-base font-semibold">{title}</p>
          {description ? (
            <p className="m-0 text-sm leading-relaxed text-base-content/60">{description}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-base-content/40 transition-transform duration-200 ease-out motion-reduce:transition-none",
            expanded && "rotate-180",
          )}
          aria-hidden
          strokeWidth={1.5}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-6 px-5 pb-5 sm:px-6">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
