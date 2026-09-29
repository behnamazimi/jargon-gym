import { clampPage, PAGE_SIZE } from "@/lib/admin/list-params";
import type { CollectionParams } from "./collections-params";
import { statusOf } from "@/lib/jargon/admin/collection-status";
import type { AdminCollectionRow } from "@/lib/jargon/admin/list-all-collections";

/** The function that lists collections returns at most this many, so more than this means some are missing. */
export const COLLECTION_LIST_LIMIT = 1000;

function byName(a: AdminCollectionRow, b: AdminCollectionRow) {
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

/** Filters, orders and pages the collections. Built-in view: published first, then by name. */
export function queryCollections(
  rows: AdminCollectionRow[],
  { view, q, page }: CollectionParams,
): { rows: AdminCollectionRow[]; total: number; page: number; truncated: boolean } {
  const needle = q.toLowerCase();
  const matching = rows
    .filter((row) => view === "all" || row.isBuiltin)
    .filter(
      (row) =>
        !needle ||
        [row.name, row.ownerEmail ?? "", row.slug ?? ""].some((text) =>
          text.toLowerCase().includes(needle),
        ),
    )
    .sort((a, b) => {
      if (view === "builtin") {
        const published = Number(statusOf(b) === "published") - Number(statusOf(a) === "published");
        if (published !== 0) return published;
      }
      return byName(a, b);
    });

  const current = clampPage(page, matching.length);
  const from = (current - 1) * PAGE_SIZE;
  return {
    rows: matching.slice(from, from + PAGE_SIZE),
    total: matching.length,
    page: current,
    truncated: rows.length >= COLLECTION_LIST_LIMIT,
  };
}
