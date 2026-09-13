"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMasteryTermRowsAction } from "@/app/(private)/jargon/mastery/actions";
import type { WebStatsSnapshot } from "@/lib/jargon/collection-stats";
import type { MasteryCollectionOption, MasteryTermRow } from "@/lib/jargon/mastery";
import { PanelSkeleton } from "@/components/page-skeleton";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MasteryOverview } from "./mastery-overview";
import { MasteryTabs, type MasteryTab } from "./mastery-tabs";
import { MasteryTermList } from "./mastery-term-list";

type MasteryPageProps = {
  collections: MasteryCollectionOption[];
  stats: WebStatsSnapshot;
  termsLearning: number;
  termsLearned: number;
};

export function MasteryPage({ collections, stats, termsLearning, termsLearned }: MasteryPageProps) {
  const [activeTab, setActiveTab] = useState<MasteryTab>("overview");
  const [termsCollectionFilter, setTermsCollectionFilter] = useState("all");
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
          collections={collections.map((c) => ({ id: c.domainId, name: c.domainName }))}
          collectionId={termsCollectionFilter}
          onCollectionChange={setTermsCollectionFilter}
        />
      ) : (
        <PanelSkeleton />
      )}
    </div>
  );
}
