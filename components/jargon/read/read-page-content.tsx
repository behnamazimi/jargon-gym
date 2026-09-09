"use client";

import { ReadCaughtUp } from "@/components/jargon/read/read-caught-up";
import { ReadErrorAlert } from "@/components/jargon/read/read-error-alert";
import { ReadTermCard } from "@/components/jargon/read/read-term-card";
import { caughtUpDescription, isTypingTarget } from "@/components/jargon/read/read-page-helpers";
import { useReadQueue } from "@/components/jargon/read/use-read-queue";
import { LinkButton } from "@/components/ui/button";
import type { StudyCollection } from "@/lib/study/types";

export type ReadQueue = ReturnType<typeof useReadQueue>;

export function handleReadEnterKey(
  event: KeyboardEvent,
  fullscreenActive: boolean,
  queue: ReadQueue,
) {
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

function ReadCaughtUpActions({ selectedCollectionId }: { selectedCollectionId: string }) {
  if (selectedCollectionId !== "all") return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <LinkButton href="/jargon" variant="outline">
        Collections
      </LinkButton>
      <LinkButton href="/jargon/import" variant="outline">
        Import jargon
      </LinkButton>
    </div>
  );
}

export function ReadQueueContent({
  queue,
  term,
  revealed,
  collections,
  selectedCollectionId,
  narrationAccess,
}: {
  queue: ReadQueue;
  term: ReadQueue["currentTerm"];
  revealed: boolean;
  collections: StudyCollection[];
  selectedCollectionId: string;
  narrationAccess: boolean;
}) {
  if (queue.status === "caughtUp") {
    return (
      <ReadCaughtUp
        description={caughtUpDescription(selectedCollectionId, collections)}
        actions={<ReadCaughtUpActions selectedCollectionId={selectedCollectionId} />}
      />
    );
  }

  if (queue.status === "ready" && term !== null) {
    return (
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
    );
  }

  if (queue.status === "error") {
    return (
      <ReadErrorAlert
        message={queue.errorMessage ?? "Couldn't load the next term. Try again."}
        isPending={queue.isFetchingMore}
        onRetry={queue.retry}
      />
    );
  }

  return null;
}
