import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminTabs } from "@/components/admin/admin-tabs";
import type { NarrationTermClip } from "@/lib/narration/sync-shared";

export type ClipFilter = "all" | "missing" | "stale";

export function parseClipFilter(value: string | undefined): ClipFilter {
  return value === "missing" || value === "stale" ? value : "all";
}

const STATE_BADGE = {
  current: "badge-success",
  stale: "badge-warning",
  missing: "badge-ghost",
} as const;

const FILTERS: { value: ClipFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "missing", label: "Missing" },
  { value: "stale", label: "Stale" },
];

function clipsHref(collectionId: string, filter: ClipFilter, page: number): string {
  const query = new URLSearchParams();
  if (filter !== "all") query.set("clips", filter);
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return `/admin/collections/${collectionId}${text ? `?${text}` : ""}#narration`;
}

export function ClipList({
  collectionId,
  clips,
  total,
  filter,
  page,
}: {
  collectionId: string;
  clips: NarrationTermClip[];
  total: number;
  filter: ClipFilter;
  page: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <AdminTabs
        label="Clip status"
        tabs={FILTERS.map((option) => ({
          href: clipsHref(collectionId, option.value, 1),
          label: option.label,
          active: option.value === filter,
        }))}
      />
      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>Term</th>
              <th>Clip</th>
              <th>Listen</th>
            </tr>
          </thead>
          <tbody>
            {clips.map((clip) => (
              <tr key={clip.id}>
                <td className="font-medium text-base-content">{clip.term}</td>
                <td>
                  <span className={`badge badge-sm ${STATE_BADGE[clip.state]}`}>{clip.state}</span>
                </td>
                <td>
                  {clip.state === "current" ? (
                    <audio
                      controls
                      preload="none"
                      className="h-8"
                      src={`/api/narration/${clip.id}`}
                      aria-label={`Narration of ${clip.term}`}
                    />
                  ) : (
                    <span className="text-base-content/50">—</span>
                  )}
                </td>
              </tr>
            ))}
            {clips.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-base-content/50">
                  No terms here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <AdminPagination
        page={page}
        total={total}
        hrefFor={(next) => clipsHref(collectionId, filter, next)}
      />
    </div>
  );
}
