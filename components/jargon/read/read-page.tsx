"use client";

import { useCallback, useRef, useState } from "react";
import type { ReadQueueSeed } from "@/app/(private)/jargon/read/actions";
import { ReadQueueContent } from "@/components/jargon/read/read-page-content";
import { ReadFullscreenFeed } from "@/components/jargon/read/read-fullscreen-feed";
import { ReadToolbar } from "@/components/jargon/read/read-toolbar";
import { useReadEnterKey } from "@/components/jargon/read/use-read-enter-key";
import { useReadQueue } from "@/components/jargon/read/use-read-queue";
import { requestFullscreenOnDocument } from "@/hooks/use-fullscreen-exit";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { useReadFullscreenPreference } from "@/hooks/use-read-fullscreen-preference";
import type { StudyCollection } from "@/lib/study/types";
import {
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

  selectedCollectionIdRef.current = selectedCollectionId;

  useMountEffect(() => {
    stripInvalidDomainParam(domainId);
  });

  useReadEnterKey(fullscreenActive, queue);

  const handleCollectionChange = useCallback(
    (nextDomainId: string) => {
      if (nextDomainId === selectedCollectionIdRef.current) return;
      setSelectedCollectionId(nextDomainId);
      replaceReadDomainInUrl(nextDomainId);
      queue.switchDomain(nextDomainId);
    },
    [queue.switchDomain],
  );

  const bindCard = useCallback((node: HTMLDivElement | null) => {
    if (node) scrollToTop(node);
  }, []);

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

      <div key={term?.id ?? "empty"} ref={bindCard} className="flex min-h-0 flex-1 flex-col">
        <ReadQueueContent
          queue={queue}
          term={term}
          revealed={revealed}
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          narrationAccess={narrationAccess}
        />
      </div>
    </div>
  );
}
