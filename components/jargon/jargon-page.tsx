"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JargonPageData } from "@/lib/jargon/types";
import { Card, CardContent } from "@/components/ui/card";
import { useJargonList } from "@/hooks/use-jargon-list";
import { PageShell } from "@/components/page-container";
import { CategoryChips } from "./category-chips";
import { Header } from "./header";
import { QuizFab } from "./quiz-fab";
import { SearchBar } from "./search-bar";
import { TermList } from "./term-list";
import { TermFormDialog } from "./term-form-dialog";
import { Toolbar } from "./toolbar";

type JargonPageProps = {
  initialData: JargonPageData;
  initialTermId?: string;
};

export function JargonPage({ initialData, initialTermId }: JargonPageProps) {
  const [termLinkNotice, setTermLinkNotice] = useState<string | null>(null);
  const [addTermOpen, setAddTermOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const deepLinkApplied = useRef(false);

  const {
    domain,
    terms,
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
    toggleCategory,
    toggleOpen,
    toggleKnown,
    clearSearch,
    focusTerm,
  } = useJargonList(initialData);

  const domainWithLiveCount = useMemo(
    () => ({ ...domain, knownCount: knownTerms.size }),
    [domain, knownTerms.size],
  );

  const isOwner = domain.source === "owned";

  const domainsWithLiveCounts = useMemo(
    () =>
      initialData.domains.map((d) =>
        d.id === domain.id ? { ...d, knownCount: knownTerms.size } : d,
      ),
    [initialData.domains, domain.id, knownTerms.size],
  );

  useEffect(() => {
    if (!initialTermId || deepLinkApplied.current) return;
    deepLinkApplied.current = true;

    const term = terms.find((t) => t.id === initialTermId);
    if (!term) {
      setTermLinkNotice("That term is not in this collection.");
      return;
    }

    focusTerm(term.id, term.term);
  }, [initialTermId, terms, focusTerm]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      e.preventDefault();
      searchInputRef.current?.focus();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <PageShell>
        <Header
          domain={domainWithLiveCount}
          domains={domainsWithLiveCounts}
          categoryCount={categories.length}
          isOwner={isOwner}
          onAddTerm={isOwner ? () => setAddTermOpen(true) : undefined}
        />

        <Card className="gap-0 p-0 ring-foreground/5">
          <CardContent className="space-y-3 px-4 py-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={clearSearch}
              inputRef={searchInputRef}
            />
            <CategoryChips
              categories={categories}
              counts={categoryCounts}
              totalCount={terms.length}
              activeCategories={activeCategories}
              onToggle={toggleCategory}
            />
            <Toolbar
              hideKnown={hideKnown}
              onHideKnownChange={setHideKnown}
              sortMode={sortMode}
              onSortChange={setSortMode}
              visibleCount={filteredTerms.length}
            />
          </CardContent>
        </Card>

        {termLinkNotice ? <p className="text-sm text-muted-foreground">{termLinkNotice}</p> : null}

        <TermList
          terms={filteredTerms}
          knownTerms={knownTerms}
          openTerms={openTerms}
          isOwner={isOwner}
          domainId={domain.id}
          domainTerms={terms}
          onToggleOpen={toggleOpen}
          onToggleKnown={toggleKnown}
        />
      </PageShell>
      {isOwner ? (
        <TermFormDialog
          mode="create"
          domainId={domain.id}
          domainTerms={terms}
          isOpen={addTermOpen}
          onOpenChange={setAddTermOpen}
        />
      ) : null}
      <QuizFab />
    </>
  );
}
