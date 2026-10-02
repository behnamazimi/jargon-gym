"use client";

import { ArrowUpRight, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { QuizPanel } from "@/components/jargon/quiz/quiz-ui";
import { StoryFooter } from "@/components/jargon/read/stories/story-footer";
import { StoryMarkKnown } from "@/components/jargon/read/stories/story-mark-known";
import { StoryNarrationPlayer } from "@/components/jargon/read/stories/story-narration-player";
import { StoryBody } from "@/components/jargon/read/stories/story-body";
import { useNarrationAutoScroll } from "@/components/jargon/read/stories/use-narration-auto-scroll";
import type { StorySession } from "@/components/jargon/read/stories/use-story-session";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { buildTimeline, sentenceAtFraction } from "@/lib/stories/highlight";
import { storyMetaLabels } from "@/lib/stories/meta";
import type { Story, StoryTerm } from "@/lib/stories/types";

/** Each term's first wording in the piece, in reading order. */
function firstOccurrences(story: Story): Map<string, string> {
  const occurrences = new Map<string, string>();
  for (const segment of story.segments) {
    if (segment.termId && !occurrences.has(segment.termId)) {
      occurrences.set(segment.termId, segment.text);
    }
  }
  return occurrences;
}

/** Opens the term already revealed without recording a read: marking the
 *  story read is what credits its terms. */
function termHref(termId: string, story: Story): string {
  const params = new URLSearchParams({ termId, alreadyRead: "true" });
  if (story.domainId) params.set("domain", story.domainId);
  return `/jargon/read?${params.toString()}`;
}

function StoryHeader({
  story,
  narrationAccess,
  onNarrationProgress,
  onDismiss,
}: {
  story: Story;
  narrationAccess: boolean;
  onNarrationProgress?: (fraction: number | null) => void;
  onDismiss: () => void;
}) {
  const meta = storyMetaLabels(story);

  return (
    <header className="relative shrink-0 space-y-1 border-b border-base-300/60 px-5 py-3 sm:px-6">
      <div>
        <h2 className="font-heading m-0 min-w-0 pe-10 text-xl font-medium text-balance text-base-content sm:text-2xl sm:leading-tight">
          {story.title}
        </h2>
        {story.readAt ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss story"
            onPress={onDismiss}
            className="absolute top-1 right-3 size-11 text-base-content/70 sm:right-4 md:top-2 md:size-9"
          >
            <X className="size-4" aria-hidden strokeWidth={1.5} />
          </Button>
        )}
      </div>
      <p className="m-0 text-xs text-base-content/70">
        {meta.map((item, index) => (
          <span key={item}>
            {index > 0 ? (
              <span className="mx-1.5 text-base-content/50" aria-hidden>
                ·
              </span>
            ) : null}
            {item}
          </span>
        ))}
      </p>
      {story.outline ? (
        <p className="m-0 line-clamp-2 text-xs text-base-content/70">Outline: {story.outline}</p>
      ) : null}
      {narrationAccess ? (
        <div className="pt-1">
          <StoryNarrationPlayer
            key={story.id}
            storyId={story.id}
            onProgress={onNarrationProgress}
          />
        </div>
      ) : null}
    </header>
  );
}

function StoryGlossary({ story, termById }: { story: Story; termById: Map<string, StoryTerm> }) {
  const newTermIds = new Set(story.newTermIds);
  const occurrences = [...firstOccurrences(story)];

  return (
    <Collapsible className="group border-t border-base-300/60 pt-2">
      <CollapsibleTrigger className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] cursor-pointer items-center justify-between gap-3 rounded-field border-none bg-transparent px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <span className="text-xs font-semibold tracking-wider text-base-content/70 uppercase">
          Terms in this piece ({occurrences.length})
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-base-content/70 transition-transform duration-200 group-data-[expanded]:rotate-180"
          aria-hidden
          strokeWidth={1.5}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="m-0 list-none divide-y divide-base-300/60 p-0">
          {occurrences.map(([termId, surface]) => {
            const term = termById.get(termId);
            if (!term) {
              return (
                <li key={termId} className="py-3 text-sm text-base-content/70">
                  <span className="font-medium">{surface}</span> · No longer available
                </li>
              );
            }
            return (
              <li key={termId} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="m-0 min-w-0 text-sm font-medium text-base-content">{term.term}</p>
                  <div className="-me-1.5 flex shrink-0 items-center gap-1">
                    {newTermIds.has(termId) ? (
                      <StoryMarkKnown termId={termId} term={term.term} />
                    ) : null}
                    <Link
                      href={termHref(termId, story)}
                      aria-label={`Open ${term.term}`}
                      className="btn btn-ghost btn-square btn-xs size-11 text-base-content/70 md:size-8"
                    >
                      <ArrowUpRight className="size-4" aria-hidden strokeWidth={1.5} />
                    </Link>
                  </div>
                </div>
                <p className="m-0 text-sm text-base-content/70">{term.definition}</p>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function StoryReader({
  session,
  story,
  terms,
  narrationAccess,
  narrationHighlight,
}: {
  session: StorySession;
  story: Story;
  terms: StoryTerm[];
  narrationAccess: boolean;
  narrationHighlight: boolean;
}) {
  const termById = new Map(terms.map((term) => [term.id, term]));
  const timeline = useMemo(
    () =>
      narrationAccess && narrationHighlight
        ? buildTimeline(story.title, story.segments, story.language)
        : null,
    [narrationAccess, narrationHighlight, story],
  );
  const [activeSentence, setActiveSentence] = useState<number | null>(null);
  const { pause: pauseAutoScroll, keepInView } = useNarrationAutoScroll();

  // Nothing is highlighted while the option is off, so a sentence picked
  // before it was turned off doesn't come back when it is turned on.
  if (!timeline && activeSentence !== null) setActiveSentence(null);

  function showNarrationProgress(fraction: number | null) {
    if (!timeline) return;
    setActiveSentence(fraction === null ? null : sentenceAtFraction(timeline, fraction));
  }

  return (
    <QuizPanel className="flex min-h-0 flex-1 flex-col">
      <StoryHeader
        story={story}
        narrationAccess={narrationAccess}
        onNarrationProgress={timeline ? showNarrationProgress : undefined}
        onDismiss={() => void session.dismiss()}
      />
      <div
        onWheel={pauseAutoScroll}
        onTouchMove={pauseAutoScroll}
        onKeyDown={pauseAutoScroll}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6"
      >
        <StoryBody
          story={story}
          termById={termById}
          timeline={timeline}
          activeSentence={activeSentence}
          keepInView={keepInView}
        />
        <StoryGlossary story={story} termById={termById} />
      </div>
      <StoryFooter session={session} story={story} />
    </QuizPanel>
  );
}
