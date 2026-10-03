"use client";

import { AlertCircle, PauseCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { QuizCenteredState, QuizPanelBody } from "@/components/quiz/quiz-ui";
import { Button, LinkButton } from "@/components/ui/button";
import { useReviewToggle } from "@/hooks/use-review-toggle";
import type { PausedStudyCollection } from "@/lib/study/types";

const MAX_LISTED = 5;

/** Shown by Read, Review, Quiz and Stories when nothing is active. Users
 *  with no collections at all are redirected to the Library instead, so
 *  this is almost always "everything is paused" — resumable in place. */
export function StudyNoActiveCollectionsState({
  paused,
  activity,
}: {
  paused: PausedStudyCollection[];
  /** Completes "Resume one to start …", e.g. "reviewing". */
  activity: string;
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const { setActiveForReview } = useReviewToggle();
  const [resumingId, setResumingId] = useState<string | null>(null);

  if (paused.length === 0) {
    return (
      <QuizPanelBody>
        <QuizCenteredState
          icon={AlertCircle}
          title="No active collections"
          description={`Add a collection to your library to start ${activity}.`}
        >
          <LinkButton href="/jargon" variant="outline" className="min-h-11">
            Go to library
          </LinkButton>
        </QuizCenteredState>
      </QuizPanelBody>
    );
  }

  async function handleResume(domainId: string) {
    setResumingId(domainId);
    const ok = await setActiveForReview(domainId, true);
    if (ok) {
      startRefresh(() => router.refresh());
    } else {
      setResumingId(null);
    }
  }

  const busy = resumingId !== null || isRefreshing;
  const hidden = paused.length - MAX_LISTED;

  return (
    <QuizPanelBody>
      <QuizCenteredState
        icon={PauseCircle}
        title={
          paused.length === 1 ? "Your collection is paused" : "All your collections are paused"
        }
        description={`Resume one to start ${activity} again.`}
      >
        <ul className="m-0 w-full list-none divide-y divide-base-300/60 rounded-field p-0 ring-1 ring-base-content/10">
          {paused.slice(0, MAX_LISTED).map((collection) => (
            <li key={collection.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate text-start text-sm font-medium">
                {collection.name}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-11 shrink-0 md:min-h-8"
                isDisabled={busy}
                onPress={() => void handleResume(collection.id)}
              >
                {resumingId === collection.id ? "Resuming…" : "Resume"}
              </Button>
            </li>
          ))}
        </ul>
        {hidden > 0 ? (
          <p className="m-0 text-xs text-base-content/70">{hidden} more paused in your library.</p>
        ) : null}
        <LinkButton href="/jargon" variant="ghost" className="min-h-11">
          Go to library
        </LinkButton>
      </QuizCenteredState>
    </QuizPanelBody>
  );
}
