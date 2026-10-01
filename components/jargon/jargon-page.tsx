"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getJargonCollectionDataAction } from "@/app/(private)/jargon/(collection)/actions";
import type { JargonPageData } from "@/lib/jargon/types";
import { useJargonList } from "@/hooks/use-jargon-list";
import { useSlashToFocus } from "@/hooks/use-slash-to-focus";
import { PageShell } from "@/components/page-container";
import { JargonListSkeleton } from "@/components/page-skeleton";
import { useToast } from "@/components/ui/toast";
import { DomainSidebar } from "./domain-sidebar";
import { DomainSidebarDrawer } from "./domain-sidebar-drawer";
import { ImportedBanner, useImportedNotice, type ImportedSummary } from "./imported-banner";
import { JargonDomainHeader } from "./jargon-domain-header";
import { JargonFilters } from "./jargon-filters";
import { dropSearchParamFromUrl, replaceLibraryDomainInUrl } from "./jargon-page-helpers";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { AddTermDialog } from "./add-term-dialog";
import { UnfinishedSection } from "./unfinished-section";
import { TermList } from "./term-list";

type JargonPageProps = {
  initialData: JargonPageData;
  narrationAccess: boolean;
  /** What the import that just finished added (from ?added=). */
  importedSummary?: ImportedSummary;
  /** Open the Add term sheet right away (from ?add=1). */
  openAddTerm?: boolean;
  topSlot?: ReactNode;
};

export function JargonPage({
  initialData,
  narrationAccess,
  importedSummary,
  openAddTerm = false,
  topSlot,
}: JargonPageProps) {
  const [addTermOpen, setAddTermOpen] = useState(openAddTerm);
  const [finishOpen, setFinishOpen] = useState(false);
  useMountEffect(() => void (openAddTerm && dropSearchParamFromUrl("add")));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  // The collection on screen, separate from the server-rendered `initialData`,
  // so switching collections doesn't need a route navigation (a remount).
  const [activeData, setActiveData] = useState(initialData);
  const importedNotice = useImportedNotice(importedSummary);
  const [activeNarrationAccess, setActiveNarrationAccess] = useState(narrationAccess);
  useEffect(() => setActiveData(initialData), [initialData]);
  useEffect(() => setActiveNarrationAccess(narrationAccess), [narrationAccess]);

  async function refreshCurrentDomain() {
    const result = await getJargonCollectionDataAction(activeData.domain.id);
    if ("data" in result) setActiveData(result.data);
  }

  const switchRequestIdRef = useRef(0);
  const [switchingDomainId, setSwitchingDomainId] = useState<string | null>(null);

  async function handleSelectDomain(domainId: string) {
    if (domainId === switchingDomainId) return;

    if (domainId === activeData.domain.id) {
      if (!switchingDomainId) return;
      // Clicking back to the collection already on screen cancels the
      // in-flight switch so a slower B response can't overwrite A.
      switchRequestIdRef.current++;
      setSwitchingDomainId(null);
      return;
    }

    const requestId = ++switchRequestIdRef.current;
    setSwitchingDomainId(domainId);
    setAddTermOpen(false); // dialog is scoped to the domain being left
    setFinishOpen(false);

    const result = await getJargonCollectionDataAction(domainId);
    if (switchRequestIdRef.current !== requestId) return; // superseded by a newer switch

    setSwitchingDomainId(null);
    if ("emptyCollection" in result) {
      // Rare: the target disappeared. There's no "empty" branch to render here,
      // so navigate and let the server component pick the page.
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

  const untriagedCount = useMemo(
    () => terms.filter((t) => !knownTerms.has(t.id) && !markedKnownTerms.has(t.id)).length,
    [terms, knownTerms, markedKnownTerms],
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

  useSlashToFocus(searchInputRef);

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
              {topSlot}
              <ImportedBanner
                summary={importedNotice.summary}
                domain={domain}
                onFinish={() => setFinishOpen(true)}
                onDismiss={importedNotice.dismiss}
              />
              <JargonDomainHeader
                domain={domainWithLiveCount}
                domains={domainsWithLiveCounts}
                terms={terms}
                categoryCount={categories.length}
                isOwner={isOwner}
                untriagedCount={untriagedCount}
                onAddTerm={isOwner ? () => setAddTermOpen(true) : undefined}
                onToggleActiveForReviewLocal={setDomainActiveForReview}
              />

              {isOwner ? (
                <UnfinishedSection
                  terms={activeData.unfinishedTerms}
                  isOpen={finishOpen}
                  onOpenChange={setFinishOpen}
                  onChanged={refreshCurrentDomain}
                />
              ) : null}

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
                language={domain.language}
                domainTerms={terms}
                hasUnfinished={activeData.unfinishedTerms.length > 0}
                onAddTerm={() => setAddTermOpen(true)}
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
        <AddTermDialog
          domainId={domain.id}
          domainTerms={terms}
          unfinishedTerms={activeData.unfinishedTerms}
          isOpen={addTermOpen}
          onOpenChange={setAddTermOpen}
          onOpenTerm={setSearchQuery}
        />
      ) : null}
    </>
  );
}
