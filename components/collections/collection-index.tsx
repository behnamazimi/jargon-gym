"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";

export type CollectionIndexRow = {
  slug: string;
  name: string;
  description: string;
  kindLine: string;
  count: number;
  lang?: string;
  specimen: { term: string; definition: string } | null;
};

function matches(row: CollectionIndexRow, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return row.name.toLowerCase().includes(q) || row.description.toLowerCase().includes(q);
}

/** Every built-in collection A to Z, filtered as you type. */
export function CollectionIndex({ rows }: { rows: CollectionIndexRow[] }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const visible = rows.filter((row) => matches(row, deferred));

  return (
    <div>
      <label className="input input-lg w-full max-w-md">
        <Search aria-hidden className="size-4 shrink-0 opacity-60" strokeWidth={1.75} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search collections"
          aria-label="Search collections"
          className="grow"
        />
      </label>
      <p aria-live="polite" className="mt-3 m-0 text-sm text-base-content/60">
        {visible.length === rows.length
          ? `${rows.length} ${rows.length === 1 ? "collection" : "collections"}`
          : `${visible.length} of ${rows.length}`}
      </p>

      {visible.length === 0 ? (
        <p className="mt-10 m-0 text-base text-base-content/70">
          No collection matches &ldquo;{deferred.trim()}&rdquo;.
        </p>
      ) : (
        <ul className="m-0 mt-8 list-none border-b border-base-300 p-0">
          {visible.map((row) => (
            <li key={row.slug} className="border-t border-base-300">
              <Link
                href={`/collections/${row.slug}`}
                className="group grid grid-cols-1 gap-x-8 gap-y-2 py-6 text-base-content no-underline sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline"
              >
                <span
                  lang={row.lang}
                  className="font-heading text-2xl font-medium tracking-tight [overflow-wrap:anywhere] group-hover:underline group-hover:decoration-base-content/30 group-hover:underline-offset-4 sm:text-3xl"
                >
                  {row.name}
                </span>
                <span className="flex items-center gap-2 text-sm text-base-content/70 sm:justify-end">
                  {row.kindLine}
                  <span className="text-base-content/50" aria-hidden>
                    ·
                  </span>
                  <span className="tabular-nums">{row.count}</span>
                  <ArrowRight
                    aria-hidden
                    className="ms-1 size-4 shrink-0 transition-transform duration-150 ease-out group-hover:translate-x-1"
                    strokeWidth={1.75}
                  />
                </span>
                {row.specimen ? (
                  <span className="line-clamp-1 text-sm text-base-content/65 sm:col-span-2">
                    <span lang={row.lang} className="font-medium text-base-content/80">
                      {row.specimen.term}
                    </span>
                    <span aria-hidden> — </span>
                    <span lang={row.lang}>{row.specimen.definition}</span>
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
