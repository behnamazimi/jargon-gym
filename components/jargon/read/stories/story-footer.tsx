"use client";

import { Check, RefreshCw, SlidersHorizontal, ThumbsDown, ThumbsUp } from "lucide-react";
import type { ReactNode } from "react";
import type { StorySession } from "@/components/jargon/read/stories/use-story-session";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import type { Story } from "@/lib/stories/types";

const PRESS_CLASS = "transition-transform duration-150 ease-out active:scale-[0.96]";

function IconToggle({
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
      isSelected={isSelected}
      onChange={onChange}
      aria-label={label}
      className={`btn-square size-11 md:size-9 ${PRESS_CLASS}`}
    >
      {children}
    </Toggle>
  );
}

export function StoryFooter({ session, story }: { session: StorySession; story: Story }) {
  const isRead = Boolean(story.readAt);

  return (
    <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-base-300/60 px-3 py-3 sm:px-6">
      <div className="flex items-center">
        <IconToggle
          isSelected={story.vote === 1}
          label="I liked this style"
          onChange={() => void session.vote(1)}
        >
          <ThumbsUp className="size-4" aria-hidden strokeWidth={1.5} />
        </IconToggle>
        <IconToggle
          isSelected={story.vote === -1}
          label="I didn't like this style"
          onChange={() => void session.vote(-1)}
        >
          <ThumbsDown className="size-4" aria-hidden strokeWidth={1.5} />
        </IconToggle>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Change setup"
          onPress={session.backToSetup}
          className={`size-11 md:size-9 ${PRESS_CLASS}`}
        >
          <SlidersHorizontal className="size-4" aria-hidden strokeWidth={1.5} />
        </Button>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-2">
        {isRead ? (
          <>
            <span
              role="status"
              className="inline-flex items-center gap-1 px-1 text-sm font-semibold text-success"
            >
              <Check className="size-4" aria-hidden strokeWidth={2.5} />
              Read
            </span>
            <Button
              type="button"
              onPress={() => void session.generate()}
              className={`min-h-11 px-4 ${PRESS_CLASS}`}
            >
              New story
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="New story"
              onPress={() => void session.generate()}
              className={`size-11 ${PRESS_CLASS}`}
            >
              <RefreshCw className="size-4" aria-hidden strokeWidth={1.5} />
            </Button>
            <Button
              type="button"
              onPress={() => void session.markRead()}
              isDisabled={session.isMarkingRead}
              className={`min-h-11 px-4 ${PRESS_CLASS}`}
            >
              Mark as read
            </Button>
          </>
        )}
      </div>
    </footer>
  );
}
