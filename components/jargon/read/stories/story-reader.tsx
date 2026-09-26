"use client";

import { ArrowUpRight, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { QuizPanel } from "@/components/jargon/quiz/quiz-ui";
import { StoryFooter } from "@/components/jargon/read/stories/story-footer";
import { StoryMarkKnown } from "@/components/jargon/read/stories/story-mark-known";
import { StoryNarrationPlayer } from "@/components/jargon/read/stories/story-narration-player";
import { StoryTermPopover } from "@/components/jargon/read/stories/story-term-popover";
import type { StorySession } from "@/components/jargon/read/stories/use-story-session";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toParagraphs } from "@/lib/stories/paragraphs";
import { findFormat, findTone } from "@/lib/stories/styles";
import type { Story, StoryTerm } from "@/lib/stories/types";

const READING_LEVEL_LABELS = { plain: "Plain", professional: "Professional", expert: "Expert" };

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
  onDismiss,
}: {
  story: Story;
  narrationAccess: boolean;
  onDismiss: () => void;
}) {
  const meta = [
    findFormat(story.format)?.label,
    findTone(story.tone)?.label,
    READING_LEVEL_LABELS[story.readingLevel],
    story.cefrLevel,
  ].filter(Boolean);

  return (
    <header className="shrink-0 space-y-1 border-b border-base-300/60 px-5 py-3 sm:px-6">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-heading m-0 min-w-0 text-xl font-semibold tracking-tight text-balance text-base-content sm:text-2xl sm:leading-tight">
          {story.title}
        </h2>
        {story.readAt ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss story"
            onPress={onDismiss}
            className="-me-2 -mt-1 size-11 shrink-0 text-base-content/60 md:size-9"
          >
            <X className="size-4" aria-hidden strokeWidth={1.5} />
          </Button>
        )}
      </div>
      <p className="m-0 text-xs tracking-wide text-base-content/50">
        {meta.map((item, index) => (
          <span key={item}>
            {index > 0 ? (
              <span className="mx-1.5 text-base-content/35" aria-hidden>
                ·
              </span>
            ) : null}
            {item}
          </span>
        ))}
      </p>
      {story.outline ? (
        <p className="m-0 line-clamp-2 text-xs text-base-content/50">Outline: {story.outline}</p>
      ) : null}
      {narrationAccess ? (
        <div className="pt-1">
          <StoryNarrationPlayer key={story.id} storyId={story.id} />
        </div>
      ) : null}
    </header>
  );
}

function StoryBody({ story, termById }: { story: Story; termById: Map<string, StoryTerm> }) {
  return (
    <div className="flex max-w-prose flex-col gap-4 text-[1.0625rem] leading-7 break-words text-base-content/90">
      {toParagraphs(story.segments).map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex} className="m-0 whitespace-pre-line">
          {paragraph.map((segment, index) =>
            segment.termId ? (
              <StoryTermPopover
                key={index}
                text={segment.text}
                term={termById.get(segment.termId)}
              />
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}

function StoryGlossary({ story, termById }: { story: Story; termById: Map<string, StoryTerm> }) {
  const newTermIds = new Set(story.newTermIds);
  const occurrences = [...firstOccurrences(story)];

  return (
    <Collapsible className="group border-t border-base-300/60 pt-2">
      <CollapsibleTrigger className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] cursor-pointer items-center justify-between gap-3 rounded-lg border-none bg-transparent px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <span className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
          Terms in this piece ({occurrences.length})
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-base-content/50 transition-transform duration-200 group-data-[expanded]:rotate-180"
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
                <li key={termId} className="py-3 text-sm text-base-content/50">
                  <span className="font-semibold">{surface}</span> · No longer available
                </li>
              );
            }
            return (
              <li key={termId} className="py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="m-0 min-w-0 text-sm font-semibold text-base-content">{term.term}</p>
                  <div className="-me-1.5 flex shrink-0 items-center gap-0.5">
                    {newTermIds.has(termId) ? (
                      <StoryMarkKnown termId={termId} term={term.term} />
                    ) : null}
                    <Link
                      href={termHref(termId, story)}
                      aria-label={`Open ${term.term}`}
                      className="btn btn-ghost btn-square btn-xs size-11 text-base-content/50 md:size-8"
                    >
                      <ArrowUpRight className="size-4" aria-hidden strokeWidth={1.5} />
                    </Link>
                  </div>
                </div>
                <p className="m-0 text-sm leading-relaxed text-base-content/65">
                  {term.definition}
                </p>
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
}: {
  session: StorySession;
  story: Story;
  terms: StoryTerm[];
  narrationAccess: boolean;
}) {
  const termById = new Map(terms.map((term) => [term.id, term]));

  return (
    <QuizPanel className="flex min-h-0 flex-1 flex-col">
      <StoryHeader
        story={story}
        narrationAccess={narrationAccess}
        onDismiss={() => void session.dismiss()}
      />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
        <StoryBody story={story} termById={termById} />
        <StoryGlossary story={story} termById={termById} />
      </div>
      <StoryFooter session={session} story={story} />
    </QuizPanel>
  );
}
