"use client";

import { useEffect, useState } from "react";
import { QuizPanel } from "@/components/jargon/quiz/quiz-ui";
import { TermBody } from "@/components/jargon/term-body";
import { cn } from "@/lib/utils";
import { MOCK_TERMS, type MockTerm } from "@/components/landing/term-card-mockup-data";

const ROTATE_INTERVAL_MS = 5000;

function pickNextIndex(current: number, length: number) {
  if (length <= 1) return current;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

function TermCardHeader({ term }: { term: MockTerm }) {
  return (
    <header className="shrink-0 border-b border-base-300/60 px-5 py-3 sm:px-6">
      <h3 className="font-heading m-0 text-xl font-semibold tracking-tight text-base-content sm:text-2xl sm:leading-tight">
        {term.term}
      </h3>
      <p className="mt-1 mb-0 text-xs tracking-wide text-base-content/50">
        <span>{term.domainName}</span>
        <span className="mx-1.5 text-base-content/35" aria-hidden>
          ·
        </span>
        <span>{term.category}</span>
      </p>
    </header>
  );
}

// Dissolve, not a swap. All faces stay mounted so this only ever animates an
// opacity change on an already-painted element, never a fresh mount, which is
// what makes the crossfade actually interpolate instead of snapping.
const CROSSFADE_TRANSITION =
  "transition-opacity duration-700 ease-in-out motion-reduce:transition-none";

function TermCardFace({ term, visible }: { term: MockTerm; visible: boolean }) {
  return (
    <QuizPanel
      className={cn(
        "col-start-1 row-start-1",
        CROSSFADE_TRANSITION,
        visible ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
      )}
    >
      <TermCardHeader term={term} />
      <div className="max-h-[472px] overflow-y-auto px-5 py-4 sm:px-6">
        <TermBody term={term} showSearchLink={false} />
      </div>
    </QuizPanel>
  );
}

export function TermCardMockup() {
  // A fixed starting term keeps server and client markup identical; the random
  // pool only kicks in once this has mounted and the interval starts ticking.
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setActiveIndex((current) => pickNextIndex(current, MOCK_TERMS.length));
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPaused]);

  return (
    <div
      className="relative mx-auto grid w-full max-w-md grid-cols-1 grid-rows-1"
      aria-hidden
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {MOCK_TERMS.map((term, index) => (
        <TermCardFace key={term.id} term={term} visible={index === activeIndex} />
      ))}
    </div>
  );
}
