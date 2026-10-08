"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReadQueueSeed } from "@/app/(private)/app/read/actions";
import { ReadQueueContent } from "@/components/read/read-page-content";
import { ReadFullscreenFeed } from "@/components/read/read-fullscreen-feed";
import { useReadFocus } from "@/components/read/read-focus";
import { ReadToolbar } from "@/components/read/read-toolbar";
import { useReadEnterKey } from "@/components/read/use-read-enter-key";
import { useReadQueue } from "@/components/read/use-read-queue";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { saveReadCollectionPreference } from "@/lib/read/collection-preference";
import type { ReadOptions } from "@/lib/read/options";
import type { StudyCollection } from "@/lib/study/types";
import {
  replaceReadCollectionInUrl,
  scrollToTop,
  normalizeCardsUrl,
} from "@/components/read/read-page-helpers";

type ReadPageProps = {
  seed: ReadQueueSeed;
  collections: StudyCollection[];
  collectionId: string;
  narrationAccess: boolean;
  options: ReadOptions;
};

export function ReadPage({
  seed,
  collections,
  collectionId,
  narrationAccess,
  options,
}: ReadPageProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState(collectionId);
  const { active: fullscreenActive, exit: handleExitFullscreen } = useReadFocus();
  const queue = useReadQueue({ collectionId: selectedCollectionId, seed });
  const selectedCollectionIdRef = useRef(selectedCollectionId);

  selectedCollectionIdRef.current = selectedCollectionId;

  useMountEffect(() => {
    normalizeCardsUrl(collectionId);
  });

  useReadEnterKey(fullscreenActive, queue);

  const term = queue.currentTerm;
  const revealed = term ? options.revealedDefault || queue.isRevealed(term.id) : false;

  // With cards revealed by default, showing a card is what counts the read,
  // the same rule focus mode uses. `reveal` records each term only once.
  const shownTermId = !fullscreenActive && options.revealedDefault ? term?.id : undefined;
  const { reveal } = queue;
  useEffect(() => {
    if (shownTermId) reveal(shownTermId);
  }, [shownTermId, reveal]);

  const handleCollectionChange = useCallback(
    (nextCollectionId: string) => {
      if (nextCollectionId === selectedCollectionIdRef.current) return;
      setSelectedCollectionId(nextCollectionId);
      replaceReadCollectionInUrl(nextCollectionId);
      queue.switchCollection(nextCollectionId);
      saveReadCollectionPreference(nextCollectionId);
    },
    [queue.switchCollection],
  );

  const bindCard = useCallback((node: HTMLDivElement | null) => {
    if (node) scrollToTop(node);
  }, []);

  if (fullscreenActive) {
    return (
      <ReadFullscreenFeed
        queue={queue}
        narrationAccess={narrationAccess}
        onExit={handleExitFullscreen}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ReadToolbar
        collections={collections}
        selectedCollectionId={selectedCollectionId}
        isFetchingMore={queue.isFetchingMore}
        onCollectionChange={handleCollectionChange}
      />

      <div
        key={term?.id ?? "empty"}
        ref={bindCard}
        className="flex min-h-0 flex-1 scroll-mt-[calc(env(safe-area-inset-top)+3.75rem)] flex-col md:scroll-mt-4"
      >
        <ReadQueueContent
          queue={queue}
          term={term}
          revealed={revealed}
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          narrationAccess={narrationAccess}
          hideQuestion={options.hideQuestion}
        />
      </div>
    </div>
  );
}
