import type { PickContext } from "@/lib/smart-queue/types";

export type QueuePreviewItem = {
  id: string;
  term: string;
  /** Review only: which pool this term came from, shown as a small badge. */
  originStatus?: "known" | "unknown";
};

type QueuePreviewProps = {
  items: QueuePreviewItem[];
  context: PickContext;
  loading?: boolean;
  emptyMessage?: string;
};

function QueuePreviewList({ items }: { items: QueuePreviewItem[] }) {
  return (
    <ul className="m-0 list-none space-y-2.5 p-0">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex flex-col gap-1 border-b border-base-300/60 pb-2.5 last:border-0 last:pb-0"
        >
          <div className="flex items-baseline gap-2">
            <span className="tabular-nums text-xs text-base-content/40">{index + 1}.</span>
            <span className="text-sm font-medium text-base-content">{item.term}</span>
            {item.originStatus ? (
              <span className="badge badge-ghost badge-sm font-normal">{item.originStatus}</span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Collapsible setup preview of the next queue batch. Used by Read, Review,
 *  and Quiz setup flows — always a flat list now that quiz has no tiers. */
export function QueuePreview({
  items,
  loading = false,
  emptyMessage = "No terms match this selection.",
}: QueuePreviewProps) {
  return (
    <div className="collapse collapse-arrow rounded-lg border border-base-300 bg-base-100">
      <input type="checkbox" defaultChecked={false} aria-label="Toggle queue preview" />
      <div className="collapse-title min-h-0 py-3 text-sm font-medium">
        Queue preview
        {items.length > 0 ? (
          <span className="ml-2 font-normal text-base-content/60">
            ({items.length} term{items.length === 1 ? "" : "s"})
          </span>
        ) : null}
      </div>
      <div className="collapse-content space-y-4 px-4 pb-3">
        {loading ? (
          <p className="m-0 text-sm text-base-content/60">Loading preview…</p>
        ) : items.length === 0 ? (
          <p className="m-0 text-sm text-base-content/60">{emptyMessage}</p>
        ) : (
          <QueuePreviewList items={items} />
        )}
      </div>
    </div>
  );
}
