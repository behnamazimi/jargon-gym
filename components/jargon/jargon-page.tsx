"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JargonPageData } from "@/lib/jargon/types";
import { useJargonList } from "@/hooks/use-jargon-list";
import { PageShell } from "@/components/page-container";
import { DomainSidebar } from "./domain-sidebar";
import { DomainSidebarDrawer } from "./domain-sidebar-drawer";
import { JargonDomainHeader } from "./jargon-domain-header";
import { JargonFilters } from "./jargon-filters";
import { QuizFab } from "./quiz-fab";
import { TermFormDialog } from "./term-form-dialog";
import { TermList } from "./term-list";

type JargonPageProps = {
  initialData: JargonPageData;
};

export function JargonPage({ initialData }: JargonPageProps) {
  const [addTermOpen, setAddTermOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <DomainSidebarDrawer
            domains={domainsWithLiveCounts}
            currentDomain={domainWithLiveCount}
            currentDomainId={domain.id}
          />

          <aside className="hidden md:flex md:w-68 md:shrink-0">
            <div className="shadow-surface sticky top-4 flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-2xl bg-base-100 p-2">
              <DomainSidebar
                domains={domainsWithLiveCounts}
                currentDomainId={domain.id}
                className="min-h-0 flex-1"
              />
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-4">
            <JargonDomainHeader
              domain={domainWithLiveCount}
              domains={domainsWithLiveCounts}
              terms={terms}
              categoryCount={categories.length}
              isOwner={isOwner}
              onAddTerm={isOwner ? () => setAddTermOpen(true) : undefined}
            />

            <JargonFilters
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
              knownTerms={knownTerms}
              openTerms={openTerms}
              isOwner={isOwner}
              domainId={domain.id}
              domainTerms={terms}
              onToggleOpen={toggleOpen}
              onToggleKnown={toggleKnown}
            />
          </div>
        </div>
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
