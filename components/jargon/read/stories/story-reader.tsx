"use client";

import { BookOpenText, Check, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FirstExposureKnownPrompt } from "@/components/jargon/first-exposure-known-prompt";
import { QuizPanel, QuizPanelBody, QuizPanelHeader } from "@/components/jargon/quiz/quiz-ui";
import { StoryNarrationPlayer } from "@/components/jargon/read/stories/story-narration-player";
import { StoryTermPopover } from "@/components/jargon/read/stories/story-term-popover";
import type { StorySession } from "@/components/jargon/read/stories/use-story-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { findFormat, findTone } from "@/lib/stories/styles";
import type { Story, StorySegment, StoryTerm } from "@/lib/stories/types";

const READING_LEVEL_BADGES = { plain: "Plain", professional: "Professional", expert: "Expert" };
const OUTLINE_PREVIEW_LENGTH = 120;

function truncate(text: string): string {
  return text.length > OUTLINE_PREVIEW_LENGTH
    ? `${text.slice(0, OUTLINE_PREVIEW_LENGTH).trimEnd()}…`
    : text;
}

function toParagraphs(segments: StorySegment[]): StorySegment[][] {
  const paragraphs: StorySegment[][] = [[]];
  for (const segment of segments) {
    if (segment.termId) {
      paragraphs[paragraphs.length - 1]!.push(segment);
      continue;
    }
    segment.text.split(/\n\s*\n/).forEach((part, index) => {
      if (index > 0) paragraphs.push([]);
      if (part) paragraphs[paragraphs.length - 1]!.push({ text: part });
    });
  }
  return paragraphs.filter((paragraph) => paragraph.some((segment) => segment.text.trim()));
}

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

function termHref(termId: string, story: Story): string {
  const params = new URLSearchParams({ termId });
  if (story.domainId) params.set("domain", story.domainId);
  if (story.readAt) params.set("alreadyRead", "true");
  return `/jargon/read?${params.toString()}`;
}

function StoryBody({ story, termById }: { story: Story; termById: Map<string, StoryTerm> }) {
  return (
    <div className="flex max-w-prose flex-col gap-4 text-base leading-relaxed break-words">
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

  return (
    <section aria-labelledby="story-glossary-title" className="space-y-3">
      <h3 id="story-glossary-title" className="m-0 text-sm font-semibold text-base-content/80">
        Terms in this piece
      </h3>
      <ul className="m-0 list-none space-y-3 p-0">
        {[...firstOccurrences(story)].map(([termId, surface]) => {
          const term = termById.get(termId);
          return (
            <li
              key={termId}
              className="space-y-2 rounded-xl bg-base-200/50 px-4 py-3 ring-1 ring-base-content/5"
            >
              {term ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="m-0 text-sm font-semibold">{term.term}</p>
                    <Link
                      href={termHref(termId, story)}
                      className="link link-hover text-xs text-base-content/60"
                    >
                      Open term →
                    </Link>
                  </div>
                  <p className="m-0 text-sm leading-relaxed text-base-content/70">
                    {term.definition}
                  </p>
                  {newTermIds.has(termId) ? <FirstExposureKnownPrompt termId={termId} /> : null}
                </>
              ) : (
                <p className="m-0 text-sm text-base-content/50">
                  <span className="font-semibold">{surface}</span> · No longer available
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function VoteToggle({
  isSelected,
  label,
  onChange,
  children,
}: {
  isSelected: boolean;
  label: string;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <Toggle
      size="sm"
      variant="outline"
      isSelected={isSelected}
      onChange={onChange}
      aria-label={label}
      className="btn-square max-md:size-11"
    >
      {children}
    </Toggle>
  );
}

function StoryFooter({ session, story }: { session: StorySession; story: Story }) {
  const isRead = Boolean(story.readAt);

  return (
    <div className="sticky bottom-0 flex flex-col gap-3 border-t border-base-300/60 bg-base-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-2">
        <VoteToggle
          isSelected={story.vote === 1}
          label="I liked this style"
          onChange={() => void session.vote(1)}
        >
          <ThumbsUp className="size-4" aria-hidden strokeWidth={1.5} />
        </VoteToggle>
        <VoteToggle
          isSelected={story.vote === -1}
          label="I didn't like this style"
          onChange={() => void session.vote(-1)}
        >
          <ThumbsDown className="size-4" aria-hidden strokeWidth={1.5} />
        </VoteToggle>
        <Button type="button" variant="ghost" size="sm" onPress={session.backToSetup}>
          Change setup
        </Button>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={isRead ? "default" : "outline"}
          onPress={() => void session.generate()}
          className="min-h-11 flex-1 sm:flex-none"
        >
          New story
        </Button>
        {isRead ? (
          <span
            role="status"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3 text-sm font-semibold text-success sm:flex-none"
          >
            <Check className="size-4" aria-hidden strokeWidth={2.5} />
            Read
          </span>
        ) : (
          <Button
            type="button"
            onPress={() => void session.markRead()}
            isDisabled={session.isMarkingRead}
            className="min-h-11 flex-1 sm:flex-none"
          >
            Mark as read
          </Button>
        )}
      </div>
    </div>
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
  const badges = [
    findFormat(story.format)?.label,
    findTone(story.tone)?.label,
    READING_LEVEL_BADGES[story.readingLevel],
    story.cefrLevel,
  ].filter(Boolean);

  return (
    <QuizPanel className="flex min-h-0 flex-1 flex-col">
      <QuizPanelHeader
        icon={BookOpenText}
        title={story.title}
        aside={
          <div className="flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <Badge key={badge} variant="ghost" className="badge-sm">
                {badge}
              </Badge>
            ))}
          </div>
        }
        description={story.outline ? `From your outline: ${truncate(story.outline)}` : undefined}
      />
      <QuizPanelBody className="min-h-0 flex-1 overflow-y-auto">
        {narrationAccess ? <StoryNarrationPlayer key={story.id} storyId={story.id} /> : null}
        <StoryBody story={story} termById={termById} />
        <StoryGlossary story={story} termById={termById} />
      </QuizPanelBody>
      <StoryFooter session={session} story={story} />
    </QuizPanel>
  );
}
