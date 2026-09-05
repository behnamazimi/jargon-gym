"use client";

import { useState } from "react";
import type { WebStatsSnapshot } from "@/lib/jargon/collection-stats";
import type { MasteryCollectionOption, MasteryTermRow } from "@/lib/jargon/mastery";
import { MasteryOverview } from "./mastery-overview";
import { MasteryTabs, type MasteryTab } from "./mastery-tabs";
import { MasteryTermList } from "./mastery-term-list";

type MasteryPageProps = {
  collections: MasteryCollectionOption[];
  stats: WebStatsSnapshot;
  lifetimeLearningCount: number;
  lifetimeMasteredCount: number;
  termRows: MasteryTermRow[];
};

export function MasteryPage({
  collections,
  stats,
  lifetimeLearningCount,
  lifetimeMasteredCount,
  termRows,
}: MasteryPageProps) {
  const [activeTab, setActiveTab] = useState<MasteryTab>("overview");
  const [termsCollectionFilter, setTermsCollectionFilter] = useState("all");

  return (
    <div className="space-y-4">
      <MasteryTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" ? (
        <MasteryOverview
          stats={stats}
          lifetimeLearningCount={lifetimeLearningCount}
          lifetimeMasteredCount={lifetimeMasteredCount}
          onSelectCollection={(collectionId) => {
            setTermsCollectionFilter(collectionId);
            setActiveTab("terms");
          }}
        />
      ) : (
        <MasteryTermList
          termRows={termRows}
          collections={collections.map((c) => ({ id: c.domainId, name: c.domainName }))}
          initialCollectionId={termsCollectionFilter}
        />
      )}
    </div>
  );
}
