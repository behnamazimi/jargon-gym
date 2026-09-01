import type { DebugEventRow } from "@/app/(private)/jargon/debug/actions";
import { formatEventLine } from "./format";

/** One term's full review_events history, oldest first — a reveal with no
 *  matching grade after it needs no special styling to read as abandoned,
 *  it's just visibly the last thing that happened to the term. */
export function TermTimeline({ events }: { events: DebugEventRow[] }) {
  if (events.length === 0) {
    return <p className="m-0 text-xs text-base-content/50">No events logged for this term yet.</p>;
  }

  return (
    <ol className="m-0 list-none space-y-1.5 p-0">
      {events.map((event) => (
        <li key={event.id} className="text-xs text-base-content/60 tabular-nums">
          {formatEventLine(event)}
        </li>
      ))}
    </ol>
  );
}
