import { ArrowRight, Inbox } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { REQUEST_COPY } from "@/lib/requests/copy";
import type { RequestEntry } from "@/lib/requests/entry";

const CHOOSER = REQUEST_COPY.chooser;

/** The last row under a search: ask for the collection that isn't there. It
 *  turns into a plain sentence when this person can't send a request right now. */
export function RequestRow({ entry, query }: { entry: RequestEntry; query: string }) {
  const trimmed = query.trim();
  if (!trimmed || entry.state === "closed") return null;

  if (entry.state === "open") {
    return (
      <p className="m-0 text-sm text-base-content/70" role="status">
        {CHOOSER.openRequest(entry.topic)}
      </p>
    );
  }
  if (entry.state === "cap") {
    return (
      <p className="m-0 text-sm text-base-content/70" role="status">
        {CHOOSER.capReached(entry.date)}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="m-0 text-xs font-semibold tracking-wider text-base-content/70 uppercase">
        {CHOOSER.rowLabel}
      </p>
      <LinkButton
        href={`/jargon/import/request?topic=${encodeURIComponent(trimmed.slice(0, 120))}`}
        variant="ghost"
        className="shadow-surface flex h-auto min-h-16 w-full items-center justify-start gap-3 rounded-field bg-base-100 px-4 py-3 text-left"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-primary/10 text-primary">
          <Inbox className="size-5" aria-hidden strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold break-words whitespace-normal">
            {CHOOSER.rowTitle(trimmed)}
          </span>
          <span className="block text-sm font-normal whitespace-normal text-base-content/70">
            {CHOOSER.rowSubtitle}
          </span>
        </span>
        <ArrowRight
          className="size-4 shrink-0 text-base-content/70"
          aria-hidden
          strokeWidth={1.5}
        />
      </LinkButton>
      <p className="m-0 text-sm text-base-content/70">{CHOOSER.quotaLine}</p>
    </div>
  );
}
