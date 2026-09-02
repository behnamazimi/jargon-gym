import Link from "next/link";
import { ListChecks, Target } from "lucide-react";
import { debugViewHref } from "./debug-queue-page";
import { cn } from "@/lib/utils";
import type { PickContext } from "@/lib/trace-queue";

type DebugView = "queue" | "calibration";

const VIEW_OPTIONS: Array<{ value: DebugView; label: string; icon: typeof ListChecks }> = [
  { value: "queue", label: "Queue", icon: ListChecks },
  { value: "calibration", label: "Calibration", icon: Target },
];

export function DebugViewTabs({
  view,
  context,
  domainId,
}: {
  view: DebugView;
  context: PickContext;
  domainId: string;
}) {
  return (
    <div
      role="tablist"
      className="tabs tabs-box tabs-sm w-full flex-nowrap overflow-x-auto bg-base-100 p-1 ring-1 ring-base-content/10"
    >
      {VIEW_OPTIONS.map((option) => {
        const selected = option.value === view;
        const Icon = option.icon;
        return (
          <Link
            key={option.value}
            href={debugViewHref({ view: option.value, context, domainId })}
            scroll={false}
            role="tab"
            aria-selected={selected}
            className={cn("tab grow gap-1.5 no-underline md:grow-0", selected && "tab-active")}
          >
            <Icon className="size-3.5" aria-hidden strokeWidth={1.5} />
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
