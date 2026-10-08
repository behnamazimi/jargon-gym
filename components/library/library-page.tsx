"use client";

import { useRouter } from "next/navigation";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import type { LibraryPageData, LibraryTerm, Term } from "@/lib/terms/types";
import { loadTermDetails, TermDetailsScope } from "@/lib/library/details-store";
import { useLibraryList } from "@/hooks/use-library-list";
import { useSlashToFocus } from "@/hooks/use-slash-to-focus";
import { useToast } from "@/components/ui/toast";
import { ImportedNotice, type ImportedSummary } from "@/components/import/imported-banner";
import { LibraryCollectionHeader } from "./library-collection-header";
import { LibraryFilters } from "./library-filters";
import { UnfinishedSection } from "@/components/terms/unfinished-section";
import { TermList } from "@/components/terms/term-list";
import { TermRowDialogs } from "@/components/terms/term-row-dialogs";

type LibraryPageProps = {
  data: LibraryPageData;
  /** The filters cookie as the server read it, so both renders agree. */
  filtersCookie: string;
  /** What the import that just finished added (from ?added=). */
  importedSummary: Promise<ImportedSummary | undefined>;
};

/** One collection in the Library: header, filters and the term list. The
 *  sidebar lives in the layout; switching collections is a navigation. */
export function LibraryPage({ data, filtersCookie, importedSummary }: LibraryPageProps) {
  const [finishOpen, setFinishOpen] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  const [deleting, setDeleting] = useState<LibraryTerm | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const {
    collection,
    terms,
    removeTerm,
    categories,
    categoryCounts,
    filteredTerms,
    searchQuery,
    setSearchQuery,
    activeCategories,
    hideKnown,
    setHideKnown,
    sortMode,
    setSortMode,
    openTerms,
    knownTerms,
    markedKnownTerms,
    everMasteredTerms,
    toggleCategory,
    toggleOpen,
    toggleMarkedKnown,
    clearSearch,
  } = useLibraryList(data, filtersCookie);

  const liveCollection = useMemo(() => {
    const known = new Set<string>();
    const learned = new Set<string>();
    for (const term of terms) {
      if (knownTerms.has(term.id) || markedKnownTerms.has(term.id)) known.add(term.id);
      if (everMasteredTerms.has(term.id) || markedKnownTerms.has(term.id)) learned.add(term.id);
    }
    return {
      ...collection,
      knownCount: known.size,
      termsLearnedCount: learned.size,
      termCount: terms.length,
    };
  }, [collection, terms, knownTerms, markedKnownTerms, everMasteredTerms]);

  const untriagedCount = terms.length - liveCollection.knownCount;
  const isOwner = collection.source === "owned";
  const windowKey = [searchQuery, hideKnown, sortMode, [...activeCategories].join("|")].join("·");

  // Details belong to this server snapshot; an edit's revalidation brings a
  // new one, so nothing needs clearing by hand.
  const detailsScope = `${collection.id}:${data.loadedAt}`;

  useSlashToFocus(searchInputRef);

  // Stable, so a dialog opening doesn't re-render every memoized row.
  const handleEdit = useCallback(
    async (termId: string) => {
      const term = await loadTermDetails(detailsScope, termId);
      if (term) setEditing(term);
      else toast("Couldn't load that term. Try again.", "destructive");
    },
    [detailsScope, toast],
  );

  return (
    <TermDetailsScope value={detailsScope}>
      <div className="min-w-0 flex-1 space-y-6">
        <Suspense fallback={null}>
          <ImportedNotice
            summary={importedSummary}
            collection={collection}
            onFinish={() => setFinishOpen(true)}
          />
        </Suspense>
        <LibraryCollectionHeader
          collection={liveCollection}
          categoryCount={categories.length}
          isOwner={isOwner}
          untriagedCount={untriagedCount}
        />

        {isOwner ? (
          <Suspense fallback={null}>
            <UnfinishedSection
              collectionId={collection.id}
              terms={data.unfinishedTerms}
              isOpen={finishOpen}
              onOpenChange={setFinishOpen}
              onRemoved={() => router.refresh()}
            />
          </Suspense>
        ) : null}

        <LibraryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchClear={clearSearch}
          searchInputRef={searchInputRef}
          categories={categories}
          categoryCounts={categoryCounts}
          totalCount={terms.length}
          activeCategories={activeCategories}
          onToggleCategory={toggleCategory}
          hideKnown={hideKnown}
          onHideKnownChange={setHideKnown}
          sortMode={sortMode}
          onSortChange={setSortMode}
          visibleCount={filteredTerms.length}
        />

        <TermList
          terms={filteredTerms}
          windowKey={windowKey}
          knownTerms={knownTerms}
          markedKnownTerms={markedKnownTerms}
          openTerms={openTerms}
          isOwner={isOwner}
          language={collection.language}
          totalCount={terms.length}
          hasUnfinished={data.unfinishedTerms.length > 0}
          collectionId={collection.id}
          onToggleOpen={toggleOpen}
          onToggleMarkedKnown={toggleMarkedKnown}
          onEdit={handleEdit}
          onDelete={setDeleting}
        />

        {isOwner ? (
          <TermRowDialogs
            collectionTerms={terms}
            editing={editing}
            onEditingChange={setEditing}
            deleting={deleting}
            onDeletingChange={setDeleting}
            detailsScope={detailsScope}
            onRemove={removeTerm}
          />
        ) : null}
      </div>
    </TermDetailsScope>
  );
}
