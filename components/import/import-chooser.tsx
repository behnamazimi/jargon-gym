"use client";

import { FolderPlus, Layers, List, Plus, Search } from "lucide-react";
import { useState } from "react";
import { CreateCollectionDialog } from "@/components/library/create-collection-dialog";
import { LinkButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequestRow } from "@/components/requests/request-row";
import { useBrowseSearch } from "@/hooks/use-browse-search";
import { SearchResults } from "@/components/import/chooser-search-results";
import { REQUEST_COPY } from "@/lib/requests/copy";
import type { RequestEntry } from "@/lib/requests/entry";
import type { ImportDestination } from "@/lib/import/import-collections";

const SECTION_HEADING = "m-0 text-xs font-semibold tracking-wider text-base-content/70 uppercase";

const ROW_CLASS =
  "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left text-base font-normal outline-none transition-colors hover:bg-base-200/60 focus-visible:ring-2 focus-visible:ring-primary";

function RowContent({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof List;
  title: string;
  description: string;
}) {
  return (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-base-content/70">{description}</span>
      </span>
    </>
  );
}

export function ImportChooser({
  collections,
  requestEntry,
}: {
  collections: ImportDestination[];
  requestEntry: RequestEntry;
}) {
  const { query, search, addingId, addedIds, handleQuery, add } = useBrowseSearch();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-8">
      <section
        className="flex flex-col gap-2"
        data-tour="import-search"
        aria-labelledby="find-shared"
      >
        <h2 id="find-shared" className={SECTION_HEADING}>
          Find a shared collection
        </h2>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-base-content/70"
            aria-hidden
            strokeWidth={1.5}
          />
          <Input
            type="search"
            value={query}
            aria-label="What do you want to learn?"
            placeholder="What do you want to learn?"
            className="min-h-12 pl-9 text-base"
            onChange={(event) => handleQuery(event.target.value)}
          />
        </div>
        {query.trim() ? null : (
          <p className="m-0 text-sm text-base-content/70">Search shared collections.</p>
        )}
        <SearchResults
          state={search}
          addingId={addingId}
          addedIds={addedIds}
          onAdd={(id) => void add(id)}
          noMatchMessage={
            requestEntry.state === "available" ? REQUEST_COPY.chooser.noMatch : undefined
          }
        />
        <RequestRow
          entry={requestEntry}
          query={search.status === "done" || search.status === "error" ? query : ""}
        />
      </section>

      <section
        className="flex flex-col gap-2"
        data-tour="import-routes"
        aria-labelledby="start-from"
      >
        <h2 id="start-from" className={SECTION_HEADING}>
          Or add your own
        </h2>
        <ul className="shadow-surface m-0 list-none divide-y divide-base-300/60 overflow-hidden rounded-box bg-base-100 p-0">
          <li>
            <LinkButton
              href="/jargon/import/paste"
              variant="ghost"
              className={`${ROW_CLASS} h-auto rounded-none`}
            >
              <RowContent
                icon={List}
                title="I have a list"
                description="Notes, a spreadsheet, a doc or a chat message"
              />
            </LinkButton>
          </li>
          <li>
            <LinkButton
              href="/jargon/import/apps"
              variant="ghost"
              className={`${ROW_CLASS} h-auto rounded-none`}
            >
              <RowContent
                icon={Layers}
                title="Export from another app"
                description="How to copy your deck out of Quizlet, Anki and more"
              />
            </LinkButton>
          </li>
          <li>
            <LinkButton
              href="/jargon/capture"
              variant="ghost"
              className={`${ROW_CLASS} h-auto rounded-none`}
            >
              <RowContent
                icon={Plus}
                title="Just one term"
                description="Save a word you just came across"
              />
            </LinkButton>
          </li>
          <li>
            <button
              type="button"
              className={`btn btn-ghost ${ROW_CLASS} h-auto rounded-none`}
              onClick={() => setCreateOpen(true)}
            >
              <RowContent
                icon={FolderPlus}
                title="Start an empty collection"
                description="Name it now and add terms later"
              />
            </button>
          </li>
        </ul>
      </section>

      <div className="flex justify-center">
        <LinkButton
          href="/jargon/import/more"
          variant="ghost"
          size="sm"
          className="min-h-11 text-base-content/70"
        >
          More import options
        </LinkButton>
      </div>

      <CreateCollectionDialog
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        existingCollections={collections}
      />
    </div>
  );
}
