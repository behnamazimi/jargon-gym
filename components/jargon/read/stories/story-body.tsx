"use client";

import type { MouseEvent } from "react";

import { StoryTermPopover } from "@/components/jargon/read/stories/story-term-popover";
import type { StoryTimeline } from "@/lib/stories/highlight";
import { toParagraphs } from "@/lib/stories/paragraphs";
import type { Story, StorySegment, StoryTerm } from "@/lib/stories/types";
import { cn } from "@/lib/utils";

function StorySegments({
  segments,
  termById,
}: {
  segments: StorySegment[];
  termById: Map<string, StoryTerm>;
}) {
  return segments.map((segment, index) =>
    segment.termId ? (
      <StoryTermPopover key={index} text={segment.text} term={termById.get(segment.termId)} />
    ) : (
      <span key={index}>{segment.text}</span>
    ),
  );
}

/** A tap on the sentence's own text. Taps on a term (or inside its popover,
 *  which React still routes through the sentence) and finished text selections
 *  are left alone. */
function pressSentence(event: MouseEvent<HTMLElement>, press: () => void) {
  const target = event.target as Element;
  if (!event.currentTarget.contains(target) || target.closest("button")) return;
  if (window.getSelection()?.toString()) return;
  press();
}

function HighlightedParagraphs({
  timeline,
  activeSentence,
  keepInView,
  onSentencePress,
  termById,
}: {
  timeline: StoryTimeline;
  activeSentence: number | null;
  keepInView: (node: HTMLElement | null) => void;
  onSentencePress?: (index: number) => void;
  termById: Map<string, StoryTerm>;
}) {
  return timeline.paragraphs.map((sentences, paragraphIndex) => (
    <p key={paragraphIndex} className="m-0 whitespace-pre-line">
      {sentences.map((sentence) => {
        const active = sentence.index === activeSentence;
        return (
          <span
            key={sentence.index}
            ref={active ? keepInView : undefined}
            onClick={
              onSentencePress &&
              ((event) => pressSentence(event, () => onSentencePress(sentence.index)))
            }
            className={cn(
              "rounded-sm box-decoration-clone transition-colors motion-reduce:transition-none",
              active && "bg-warning/15",
              onSentencePress && "cursor-pointer",
            )}
          >
            <StorySegments segments={sentence.segments} termById={termById} />
          </span>
        );
      })}
    </p>
  ));
}

export function StoryBody({
  story,
  termById,
  timeline,
  activeSentence,
  keepInView,
  onSentencePress,
}: {
  story: Story;
  termById: Map<string, StoryTerm>;
  timeline: StoryTimeline | null;
  activeSentence: number | null;
  keepInView: (node: HTMLElement | null) => void;
  onSentencePress?: (index: number) => void;
}) {
  return (
    <div className="reading-text flex max-w-prose flex-col gap-4 text-[1.0625rem] leading-7 break-words text-base-content/90">
      {timeline ? (
        <HighlightedParagraphs
          timeline={timeline}
          activeSentence={activeSentence}
          keepInView={keepInView}
          onSentencePress={onSentencePress}
          termById={termById}
        />
      ) : (
        toParagraphs(story.segments).map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex} className="m-0 whitespace-pre-line">
            <StorySegments segments={paragraph} termById={termById} />
          </p>
        ))
      )}
    </div>
  );
}
