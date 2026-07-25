"use client";

import { ArrowLeft, BookmarkMinus, CheckCircle2, Compass, Plus } from "lucide-react";
import Link from "next/link";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import type { SharedDomain } from "@/lib/jargon/types";

type SharedDomainsBrowseProps = {
  domains: SharedDomain[];
};

export function SharedDomainsBrowse({ domains }: SharedDomainsBrowseProps) {
  const { error, busyId, addToCollection, removeFromCollection } = useCollectionActions();

  return (
    <div className="mx-auto max-w-[720px] px-5 py-7">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-[22px] font-bold tracking-tight">
            <Compass className="h-5 w-5 text-accent" />
            Browse <span className="text-accent">shared</span> domains
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Add a shared domain to your collection to study it alongside your own imports.
          </p>
        </div>
        <Link
          href="/jargon"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-accent underline-offset-2 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {domains.length === 0 ? (
        <p className="text-[13px] text-muted">No shared domains available yet.</p>
      ) : (
        <ul className="space-y-3">
          {domains.map((domain) => (
            <li
              key={domain.id}
              className="rounded-lg border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium">
                    {domain.icon ? `${domain.icon} ` : ""}
                    {domain.name}
                  </div>
                  {domain.description ? (
                    <p className="mt-1 text-[13px] text-muted">{domain.description}</p>
                  ) : null}
                  <div className="mt-1 text-[13px] text-muted">{domain.termCount} terms</div>
                </div>

                {domain.inCollection ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      In collection
                    </span>
                    <button
                      type="button"
                      disabled={busyId === domain.id}
                      onClick={() => removeFromCollection(domain.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium disabled:opacity-50"
                    >
                      <BookmarkMinus className="h-4 w-4" />
                      {busyId === domain.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === domain.id}
                    onClick={() => addToCollection(domain.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {busyId === domain.id ? "Adding…" : "Add to collection"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
