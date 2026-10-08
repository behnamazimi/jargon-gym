"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMasteryTermRowsAction } from "@/app/(private)/app/mastery/actions";
import type { WebStatsSnapshot } from "@/lib/mastery/collection-stats";
import type { MasteryCollectionOption, MasteryTermRow } from "@/lib/mastery/mastery";
import { PanelSkeleton } from "@/components/page-skeleton";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MasteryOverview } from "./mastery-overview";
import { MasteryTabs, type MasteryTab } from "./mastery-tabs";
import { MasteryTermList } from "./mastery-term-list";

type MasteryPageProps = {
  initialTab: MasteryTab;
  initialCollectionId: string;
  collections: MasteryCollectionOption[];
  stats: WebStatsSnapshot;
  termsLearning: number;
  termsLearned: number;
};

/** Keeps the tab and collection filter in the URL so Back (e.g. from a
 *  Practice link) and shared links land on the same view. `null` state
 *  lets Next sync useSearchParams. */
function replaceMasteryUrl(tab: MasteryTab, collectionId: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete("tab");
  url.searchParams.delete("collection");
  if (tab === "terms") {
    url.searchParams.set("tab", "terms");
    if (collectionId !== "all") url.searchParams.set("collection", collectionId);
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function MasteryPage({
  initialTab,
  initialCollectionId,
  collections,
  stats,
  termsLearning,
  termsLearned,
}: MasteryPageProps) {
  const [activeTab, setActiveTab] = useState<MasteryTab>(initialTab);
  const [termsCollectionFilter, setTermsCollectionFilter] = useState(initialCollectionId);
  const [termRows, setTermRows] = useState<MasteryTermRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const loadTermRows = useCallback(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoadError(null);

    void getMasteryTermRowsAction().then((result) => {
      inFlightRef.current = false;
      if ("error" in result) {
        setLoadError(result.error ?? "Couldn't load terms.");
        return;
      }
      setTermRows(result.termRows);
    });
  }, []);

  useEffect(() => {
    replaceMasteryUrl(activeTab, termsCollectionFilter);
  }, [activeTab, termsCollectionFilter]);

  useEffect(() => {
    if (activeTab !== "terms") return;
    if (termRows !== null) return;
    if (loadError) return;
    loadTermRows();
  }, [activeTab, termRows, loadError, loadTermRows]);

  return (
    <div className="space-y-4">
      <MasteryTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" ? (
        <MasteryOverview
          stats={stats}
          termsLearning={termsLearning}
          termsLearned={termsLearned}
          onSelectCollection={(collectionId) => {
            setTermsCollectionFilter(collectionId);
            setActiveTab("terms");
          }}
        />
      ) : loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
          <AlertAction>
            <Button type="button" variant="outline" size="sm" onPress={loadTermRows}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : termRows ? (
        <MasteryTermList
          termRows={termRows}
          collections={collections.map((c) => ({ id: c.collectionId, name: c.collectionName }))}
          collectionId={termsCollectionFilter}
          onCollectionChange={setTermsCollectionFilter}
        />
      ) : (
        <PanelSkeleton />
      )}
    </div>
  );
}
