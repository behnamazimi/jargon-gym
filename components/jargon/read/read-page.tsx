"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReadQueueSeed } from "@/app/(private)/jargon/read/actions";
import { ReadCaughtUp } from "@/components/jargon/read/read-caught-up";
import { ReadFullscreenFeed } from "@/components/jargon/read/read-fullscreen-feed";
import { ReadTermCard } from "@/components/jargon/read/read-term-card";
import { ReadToolbar } from "@/components/jargon/read/read-toolbar";
import { ReadErrorAlert } from "@/components/jargon/read/read-error-alert";
import { useReadQueue } from "@/components/jargon/read/use-read-queue";
import { LinkButton } from "@/components/ui/button";
import { requestFullscreenOnDocument } from "@/hooks/use-fullscreen-exit";
import { useReadFullscreenPreference } from "@/hooks/use-read-fullscreen-preference";
import type { StudyCollection } from "@/lib/study/types";
import {
  caughtUpDescription,
  isTypingTarget,
  replaceReadDomainInUrl,
  scrollToTop,
  stripInvalidDomainParam,
} from "@/components/jargon/read/read-page-helpers";

type ReadPageProps = {
  seed: ReadQueueSeed;
  collections: StudyCollection[];
  domainId: string;
  narrationAccess: boolean;
};

export function ReadPage({ seed, collections, domainId, narrationAccess }: ReadPageProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState(domainId);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const { preferenceOn, setPreference } = useReadFullscreenPreference();
  const queue = useReadQueue({ domainId: selectedCollectionId, seed });
  const selectedCollectionIdRef = useRef(selectedCollectionId);
  const cardRef = useRef<HTMLDivElement>(null);
  const previousTermIdRef = useRef<string | null>(queue.currentTerm?.id ?? null);

  selectedCollectionIdRef.current = selectedCollectionId;

  useEffect(() => {
    stripInvalidDomainParam(domainId);
  }, [domainId]);

  // Scroll back to the top of the card whenever the shown term actually
  // changes (Next/Previous/collection switch/fullscreen hand-off) — but
  // not on every render (e.g. a reveal, which keeps the same term).
  useEffect(() => {
    const currentId = queue.currentTerm?.id ?? null;
    if (previousTermIdRef.current === currentId) return;
    previousTermIdRef.current = currentId;
    scrollToTop(cardRef.current);
  }, [queue.currentTerm]);

  const handleCollectionChange = useCallback((nextDomainId: string) => {
    if (nextDomainId === selectedCollectionIdRef.current) return;
    setSelectedCollectionId(nextDomainId);
    replaceReadDomainInUrl(nextDomainId);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (fullscreenActive) return;
      if (event.key !== "Enter") return;
      if (queue.status !== "ready" || isTypingTarget(event.target)) return;

      const term = queue.currentTerm;
      if (!term) return;

      event.preventDefault();
      if (!queue.isRevealed(term.id)) {
        queue.reveal(term.id);
      } else {
        void queue.goNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    fullscreenActive,
    queue.status,
    queue.currentTerm,
    queue.isRevealed,
    queue.reveal,
    queue.goNext,
  ]);

  const handleExitFullscreen = useCallback(() => {
    setFullscreenActive(false);
    setPreference(false);
  }, [setPreference]);

  if (fullscreenActive) {
    return (
      <ReadFullscreenFeed
        queue={queue}
        narrationAccess={narrationAccess}
        onExit={handleExitFullscreen}
      />
    );
  }

  const term = queue.currentTerm;
  const revealed = term ? queue.isRevealed(term.id) : false;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ReadToolbar
        collections={collections}
        selectedCollectionId={selectedCollectionId}
        isFetchingMore={queue.isFetchingMore}
        preferenceOn={preferenceOn}
        onCollectionChange={handleCollectionChange}
        onEnterFullscreen={() => {
          // Must happen synchronously in this click handler — deferring
          // it into an effect after ReadFullscreenFeed mounts loses the
          // user gesture and silently falls back to the CSS overlay.
          requestFullscreenOnDocument();
          setFullscreenActive(true);
          setPreference(true);
        }}
      />

      <div ref={cardRef} className="flex min-h-0 flex-1 flex-col">
        {queue.status === "caughtUp" ? (
          <ReadCaughtUp
            description={caughtUpDescription(selectedCollectionId, collections)}
            actions={
              selectedCollectionId === "all" ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <LinkButton href="/jargon" variant="outline">
                    Collections
                  </LinkButton>
                  <LinkButton href="/jargon/import" variant="outline">
                    Import jargon
                  </LinkButton>
                </div>
              ) : null
            }
          />
        ) : null}

        {queue.status === "ready" && term !== null ? (
          <ReadTermCard
            term={term}
            revealed={revealed}
            canGoBack={queue.canGoBack}
            isPending={queue.isFetchingMore}
            narrationAccess={narrationAccess}
            onReveal={queue.reveal}
            onPrevious={queue.goPrevious}
            onNext={queue.goNext}
          />
        ) : null}

        {queue.status === "error" ? (
          <ReadErrorAlert
            message={queue.errorMessage ?? "Couldn't load the next term. Try again."}
            isPending={queue.isFetchingMore}
            onRetry={queue.retry}
          />
        ) : null}
      </div>
    </div>
  );
}
