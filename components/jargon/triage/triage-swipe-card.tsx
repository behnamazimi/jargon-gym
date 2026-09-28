"use client";

import { useImperativeHandle, useRef } from "react";
import { ReviewCard } from "@/components/jargon/review/review-card";
import { SwipeActionLabel } from "@/components/jargon/swipe-action";
import type { ReviewTerm } from "@/lib/review/types";

const AXIS_LOCK_PX = 8;
const COMMIT_FRACTION = 0.3;
const FLICK_MIN_PX = 40;
const FLICK_MIN_VELOCITY = 0.5; // px per ms
const FLY_OUT_MS = 180;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  dx: number;
  axis: "x" | "y" | null;
};

/** Lets the buttons and arrow keys send the card off the same way a swipe does. */
export type TriageCardHandle = { flyOut: (direction: 1 | -1) => void };

type TriageSwipeCardProps = {
  ref?: React.Ref<TriageCardHandle>;
  term: ReviewTerm;
  revealed: boolean;
  reduceMotion: boolean;
  narrationAccess: boolean;
  onReveal: () => void;
  onKnew: () => void;
  onNotYet: () => void;
};

function noop() {}

/** Review's flashcard with a drag layer on top: swipe right for "I knew
 *  this", left for "Not yet". Styles are written straight to the DOM while
 *  dragging so the card doesn't re-render on every pointer move. */
export function TriageSwipeCard({
  ref,
  term,
  revealed,
  reduceMotion,
  narrationAccess,
  onReveal,
  onKnew,
  onNotYet,
}: TriageSwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const knewLabelRef = useRef<HTMLDivElement>(null);
  const notYetLabelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const draggedRef = useRef(false);
  const committedRef = useRef(false);

  function paint(dx: number, animate: boolean) {
    const card = cardRef.current;
    if (!card) return;
    const width = card.offsetWidth || 1;
    card.style.transition = animate && !reduceMotion ? "transform 200ms ease-out" : "none";
    card.style.transform = dx === 0 ? "" : `translateX(${dx}px) rotate(${dx / 24}deg)`;
    const progress = Math.min(Math.abs(dx) / (width * COMMIT_FRACTION), 1);
    if (knewLabelRef.current) knewLabelRef.current.style.opacity = dx > 0 ? String(progress) : "0";
    if (notYetLabelRef.current) {
      notYetLabelRef.current.style.opacity = dx < 0 ? String(progress) : "0";
    }
  }

  function commit(direction: 1 | -1) {
    if (committedRef.current) return;
    committedRef.current = true;
    const done = direction === 1 ? onKnew : onNotYet;
    const card = cardRef.current;
    if (reduceMotion || !card) {
      done();
      return;
    }
    const label = direction === 1 ? knewLabelRef.current : notYetLabelRef.current;
    if (label) label.style.opacity = "1";
    card.style.transition = `transform ${FLY_OUT_MS}ms ease-in`;
    card.style.transform = `translateX(${direction * card.offsetWidth * 1.5}px) rotate(${direction * 12}deg)`;
    window.setTimeout(done, FLY_OUT_MS);
  }

  useImperativeHandle(ref, () => ({ flyOut: commit }));

  function handlePointerDown(event: React.PointerEvent) {
    if (committedRef.current || event.button !== 0) return;
    draggedRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: event.timeStamp,
      dx: 0,
      axis: null,
    };
  }

  function handlePointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (drag.axis === null) {
      if (Math.abs(dx) > AXIS_LOCK_PX && Math.abs(dx) > Math.abs(dy)) {
        drag.axis = "x";
        event.currentTarget.setPointerCapture(event.pointerId);
      } else if (Math.abs(dy) > AXIS_LOCK_PX) {
        drag.axis = "y";
      }
    }
    if (drag.axis !== "x") return;

    drag.dx = dx;
    paint(dx, false);
  }

  function handlePointerUp(event: React.PointerEvent) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.pointerId !== event.pointerId || drag.axis !== "x") return;

    draggedRef.current = true;
    const width = cardRef.current?.offsetWidth ?? 1;
    const velocity = drag.dx / Math.max(event.timeStamp - drag.startTime, 1);
    const farEnough = Math.abs(drag.dx) > width * COMMIT_FRACTION;
    const flicked = Math.abs(drag.dx) > FLICK_MIN_PX && Math.abs(velocity) > FLICK_MIN_VELOCITY;

    if (farEnough || flicked) {
      commit(drag.dx > 0 ? 1 : -1);
    } else {
      paint(0, true);
    }
  }

  function handlePointerCancel() {
    dragRef.current = null;
    paint(0, true);
  }

  return (
    <div
      ref={cardRef}
      // Every descendant too: the revealed definition scrolls on its own, and a
      // scroll area would otherwise let the browser take horizontal pans.
      data-tour="triage-card"
      className="relative flex min-h-0 flex-1 touch-pan-y flex-col rounded-2xl select-none [&_*]:touch-pan-y"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={(event) => {
        // The click that ends a drag shouldn't also flip the card.
        if (!draggedRef.current) return;
        draggedRef.current = false;
        event.stopPropagation();
        event.preventDefault();
      }}
    >
      <ReviewCard
        term={term}
        revealed={revealed}
        onReveal={onReveal}
        onPrevious={noop}
        onNext={noop}
        onMarkedKnown={noop}
        reduceMotion={reduceMotion}
        swipeEnabled={false}
        narrationAccess={narrationAccess}
        showRevealHint={false}
      />
      <SwipeActionLabel
        ref={knewLabelRef}
        kind="knew"
        className="absolute top-4 left-4 z-10 opacity-0"
      />
      <SwipeActionLabel
        ref={notYetLabelRef}
        kind="notYet"
        className="absolute top-4 right-4 z-10 opacity-0"
      />
    </div>
  );
}
