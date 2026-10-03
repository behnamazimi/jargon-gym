"use client";

import { useRef } from "react";
import { CollectionSelect } from "@/components/library/collection-select";
import { ReadCaughtUp } from "@/components/read/read-caught-up";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { Domain, Term } from "@/lib/terms/types";
import { toTriageTerm } from "@/lib/triage/deck";
import { TriageActions } from "./triage-actions";
import { TriageNextSteps, TriageSummary } from "./triage-summary";
import { type TriageCardHandle, TriageSwipeCard } from "./triage-swipe-card";
import { useTriageDeck } from "./use-triage-deck";
import { useTriageKeyboard } from "./use-triage-keyboard";

type TriagePageProps = {
  domain: Domain;
  domains: Domain[];
  terms: Term[];
  knownTermIds: string[];
  markedKnownTermIds: string[];
  notYetTermIds: string[];
  narrationAccess: boolean;
};

export function TriagePage({
  domain,
  domains,
  terms,
  knownTermIds,
  markedKnownTermIds,
  notYetTermIds,
  narrationAccess,
}: TriagePageProps) {
  const reduceMotion = usePrefersReducedMotion();
  const {
    deck,
    current,
    revealed,
    reveal,
    history,
    knownIds,
    markedKnown,
    notYetIds,
    knew: handleKnew,
    notYet: handleNotYet,
    undo: handleUndo,
    revisitNotYet: handleRevisitNotYet,
  } = useTriageDeck({
    domainId: domain.id,
    terms,
    knownTermIds,
    markedKnownTermIds,
    notYetTermIds,
  });

  const cardRef = useRef<TriageCardHandle>(null);

  // Buttons and keys play the same fly-out as a swipe; the card calls back
  // into handleKnew/handleNotYet when it's gone.
  function flyOut(direction: 1 | -1) {
    if (cardRef.current) cardRef.current.flyOut(direction);
    else if (current) (direction === 1 ? handleKnew : handleNotYet)(current.id);
  }

  useTriageKeyboard({
    onReveal: reveal,
    onKnew: () => flyOut(1),
    onNotYet: () => flyOut(-1),
    onUndo: handleUndo,
    revealed,
    enabled: current !== null,
  });

  const collectionPicker = (
    <CollectionSelect
      mode="url"
      id="triage-collection"
      aria-label="Collection"
      className="min-w-0 w-full flex-1 sm:max-w-xs"
      triggerClassName="text-sm"
      size="sm"
      collections={domains.map((d) => ({ id: d.id, name: d.name, termCount: d.termCount }))}
      value={domain.id}
      hrefBuilder={(id) => `/app/triage?domain=${id}`}
    />
  );

  const knownCount = terms.filter((t) => knownIds.has(t.id) || markedKnown.has(t.id)).length;
  const setAsideCount = terms.filter(
    (t) => notYetIds.has(t.id) && !knownIds.has(t.id) && !markedKnown.has(t.id),
  ).length;
  const sortedNote = [
    knownCount > 0 ? `${knownCount} known` : null,
    setAsideCount > 0 ? `${setAsideCount} set aside` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const topRow = (
    <div className="flex shrink-0 items-center justify-between gap-3">
      {collectionPicker}
      {current ? (
        <div className="shrink-0 text-end text-sm tabular-nums text-base-content/70">
          <p className="m-0">{deck.length} left to sort</p>
          {sortedNote ? <p className="m-0 text-xs">{sortedNote}</p> : null}
        </div>
      ) : null}
    </div>
  );

  if (!current) {
    const markedCount = history.filter(
      (choice) => choice.kind === "knew" && markedKnown.has(choice.termId),
    ).length;
    const leftToLearnCount = terms.filter(
      (t) => !knownIds.has(t.id) && !markedKnown.has(t.id),
    ).length;

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {topRow}
        {history.length > 0 ? (
          <TriageSummary
            domainId={domain.id}
            domainName={domain.name}
            markedCount={markedCount}
            leftToLearnCount={leftToLearnCount}
            hasNotYet={notYetIds.size > 0}
            onRevisitNotYet={handleRevisitNotYet}
          />
        ) : (
          <ReadCaughtUp
            title="All terms sorted"
            description={
              notYetIds.size > 0
                ? `You've sorted every term in ${domain.name}. The ones you set aside as "Not yet" stay in your learning pile.`
                : `Every term in ${domain.name} is already mastered or marked known.`
            }
            actions={
              <TriageNextSteps
                domainId={domain.id}
                hasNotYet={notYetIds.size > 0}
                onRevisitNotYet={handleRevisitNotYet}
              />
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {topRow}

      <TriageSwipeCard
        key={current.id}
        ref={cardRef}
        term={toTriageTerm(current, domain)}
        revealed={revealed}
        reduceMotion={reduceMotion}
        narrationAccess={narrationAccess}
        onReveal={reveal}
        onKnew={() => handleKnew(current.id)}
        onNotYet={() => handleNotYet(current.id)}
      />

      <TriageActions
        canUndo={history.length > 0}
        onUndo={handleUndo}
        onNotYet={() => flyOut(-1)}
        onKnew={() => flyOut(1)}
      />
    </div>
  );
}
