"use client";

import { Layers, List, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { searchSharedDomains } from "@/app/(private)/jargon/browse/actions";
import { addToCollection } from "@/app/(private)/jargon/actions";
import { CreateCollectionDialog } from "@/components/jargon/create-collection-dialog";
import { Button, LinkButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchResults, type SearchState } from "@/components/jargon/import/chooser-search-results";
import { OneTermDialog } from "@/components/jargon/import/one-term-dialog";
import type { ImportDestination } from "@/lib/jargon/import/import-collections";

const SEARCH_DEBOUNCE_MS = 300;

const ROW_CLASS =
  "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-base-200/60 focus-visible:ring-2 focus-visible:ring-primary";

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
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-base-content/60">{description}</span>
      </span>
    </>
  );
}

export function ImportChooser({ collections }: { collections: ImportDestination[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [oneTermOpen, setOneTermOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const requestId = useRef(0);

  function handleQuery(value: string) {
    setQuery(value);
    window.clearTimeout(timer.current);
    const trimmed = value.trim();
    const id = ++requestId.current;

    if (!trimmed) {
      setSearch({ status: "idle" });
      return;
    }

    setSearch({ status: "loading" });
    timer.current = window.setTimeout(async () => {
      const result = await searchSharedDomains({ search: trimmed, filter: "all", offset: 0 });
      if (id !== requestId.current) return;
      setSearch(
        result.page
          ? { status: "done", query: trimmed, domains: result.page.domains }
          : { status: "error" },
      );
    }, SEARCH_DEBOUNCE_MS);
  }

  async function handleAdd(domainId: string) {
    setAddingId(domainId);
    const result = await addToCollection(domainId);
    setAddingId(null);
    if (result.error) {
      setSearch({ status: "error" });
      return;
    }
    setAddedIds((current) => [...current, domainId]);
  }

  function handleOneTerm() {
    if (collections.length === 0) setCreateOpen(true);
    else if (collections.length === 1) router.push(`/jargon?domain=${collections[0].id}&add=1`);
    else setOneTermOpen(true);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2" data-tour="import-search">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-base-content/60"
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
        <p className="m-0 text-sm text-base-content/60">Search shared collections.</p>
        <SearchResults
          state={search}
          addingId={addingId}
          addedIds={addedIds}
          onAdd={(id) => void handleAdd(id)}
        />
      </div>

      <section className="space-y-2" data-tour="import-routes" aria-labelledby="start-from">
        <h2
          id="start-from"
          className="m-0 text-xs font-semibold tracking-wider text-base-content/60 uppercase"
        >
          Or start from what you have
        </h2>
        <ul className="shadow-surface m-0 list-none divide-y divide-base-300/60 overflow-hidden rounded-2xl bg-base-100 p-0">
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
                title="A deck from another app"
                description="Quizlet, Anki, Google Translate and more"
              />
            </LinkButton>
          </li>
          <li>
            <button type="button" className={ROW_CLASS} onClick={handleOneTerm}>
              <RowContent
                icon={Plus}
                title="Just one term"
                description="Save a word you just came across"
              />
            </button>
          </li>
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-base-content/60">Start empty and add terms later</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11"
          onPress={() => setCreateOpen(true)}
        >
          New empty collection
        </Button>
      </div>

      <div className="flex justify-center">
        <LinkButton
          href="/jargon/import/more"
          variant="ghost"
          size="sm"
          className="min-h-11 text-base-content/60"
        >
          More import options
        </LinkButton>
      </div>

      <CreateCollectionDialog
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        existingCollections={collections}
      />
      {oneTermOpen ? (
        <OneTermDialog
          collections={collections}
          isOpen={oneTermOpen}
          onOpenChange={setOneTermOpen}
        />
      ) : null}
    </div>
  );
}
