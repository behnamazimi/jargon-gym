"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getJargonCollectionDataAction } from "@/app/(private)/jargon/(collection)/actions";
import type { JargonPageData } from "@/lib/jargon/types";
import { useJargonList } from "@/hooks/use-jargon-list";
import { PageShell } from "@/components/page-container";
import { JargonListSkeleton } from "@/components/page-skeleton";
import { useToast } from "@/components/ui/toast";
import { DomainSidebar } from "./domain-sidebar";
import { DomainSidebarDrawer } from "./domain-sidebar-drawer";
import { JargonDomainHeader } from "./jargon-domain-header";
import { JargonFilters } from "./jargon-filters";
import { replaceLibraryDomainInUrl } from "./jargon-page-helpers";
import { TermFormDialog } from "./term-form-dialog";
import { TermList } from "./term-list";

type JargonPageProps = {
  initialData: JargonPageData;
  narrationAccess: boolean;
};

export function JargonPage({ initialData, narrationAccess }: JargonPageProps) {
  const [addTermOpen, setAddTermOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Owns "the collection currently on screen," separate from the
  // server-rendered `initialData` prop, so switching collections doesn't
  // require a route navigation (which would remount this whole page).
  const [activeData, setActiveData] = useState(initialData);
  const [activeNarrationAccess, setActiveNarrationAccess] = useState(narrationAccess);
  useEffect(() => setActiveData(initialData), [initialData]);
  useEffect(() => setActiveNarrationAccess(narrationAccess), [narrationAccess]);

  const switchRequestIdRef = useRef(0);
  const [switchingDomainId, setSwitchingDomainId] = useState<string | null>(null);

  async function handleSelectDomain(domainId: string) {
    if (domainId === activeData.domain.id || domainId === switchingDomainId) return;

    const requestId = ++switchRequestIdRef.current;
    setSwitchingDomainId(domainId);
    setAddTermOpen(false); // dialog is scoped to the domain being left

    const result = await getJargonCollectionDataAction(domainId);
    if (switchRequestIdRef.current !== requestId) return; // superseded by a newer switch

    setSwitchingDomainId(null);
    if ("emptyCollection" in result) {
      // Rare: the target collection disappeared between click and response.
      // The local model has no "empty" branch to render, so fall back to a
      // real navigation and let the server component pick the right page.
      router.push("/jargon");
    } else if ("error" in result) {
      toast(result.error, "destructive");
    } else {
      setActiveData(result.data);
      setActiveNarrationAccess(result.narrationAccess);
      replaceLibraryDomainInUrl(domainId);
    }
  }

  const {
    domain,
    domains,
    setDomainActiveForReview,
    terms,
    removeTermLocally,
    restoreTermLocally,
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
  } = useJargonList(activeData);

  const liveKnownCount = useMemo(
    () => new Set([...knownTerms, ...markedKnownTerms]).size,
    [knownTerms, markedKnownTerms],
  );

  const liveTermsLearnedCount = useMemo(
    () => new Set([...everMasteredTerms, ...markedKnownTerms]).size,
    [everMasteredTerms, markedKnownTerms],
  );

  const domainWithLiveCount = useMemo(
    () => ({
      ...domain,
      knownCount: liveKnownCount,
      termsLearnedCount: liveTermsLearnedCount,
      termCount: terms.length,
    }),
    [domain, liveKnownCount, liveTermsLearnedCount, terms.length],
  );

  const isOwner = domain.source === "owned";

  const domainsWithLiveCounts = useMemo(
    () =>
      domains.map((d) =>
        d.id === domain.id
          ? {
              ...d,
              knownCount: liveKnownCount,
              termsLearnedCount: liveTermsLearnedCount,
              termCount: terms.length,
            }
          : d,
      ),
    [domains, domain.id, liveKnownCount, liveTermsLearnedCount, terms.length],
  );

  // While a switch is pending, reflect the target collection in the
  // sidebar/drawer immediately instead of waiting for its data to land.
  const displayedDomain = switchingDomainId
    ? (domainsWithLiveCounts.find((d) => d.id === switchingDomainId) ?? domainWithLiveCount)
    : domainWithLiveCount;

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
            currentDomain={displayedDomain}
            currentDomainId={displayedDomain.id}
            onSelectDomain={handleSelectDomain}
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          />

          <aside className="hidden md:flex md:w-68 md:shrink-0">
            <div className="shadow-surface sticky top-4 flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-2xl bg-base-100 p-2">
              <DomainSidebar
                domains={domainsWithLiveCounts}
                currentDomainId={displayedDomain.id}
                onSelectDomain={handleSelectDomain}
                className="min-h-0 flex-1"
              />
            </div>
          </aside>

          {switchingDomainId ? (
            <JargonListSkeleton />
          ) : (
            <div className="min-w-0 flex-1 space-y-4">
              <JargonDomainHeader
                domain={domainWithLiveCount}
                domains={domainsWithLiveCounts}
                terms={terms}
                categoryCount={categories.length}
                isOwner={isOwner}
                onAddTerm={isOwner ? () => setAddTermOpen(true) : undefined}
                onToggleActiveForReviewLocal={setDomainActiveForReview}
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
                markedKnownTerms={markedKnownTerms}
                openTerms={openTerms}
                isOwner={isOwner}
                domainId={domain.id}
                domainTerms={terms}
                narrationAccess={activeNarrationAccess}
                onToggleOpen={toggleOpen}
                onToggleMarkedKnown={toggleMarkedKnown}
                onTermRemoved={removeTermLocally}
                onTermRemoveFailed={restoreTermLocally}
              />
            </div>
          )}
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
    </>
  );
}
