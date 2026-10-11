import type { ReactNode } from "react";
import { blob, box, quad, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Eye, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Line, Shape } from "../shape";
import { GOAL_LOBYAS } from "./goal-team";

const WEIGHT = { body: 3.4, detail: 2.6, fine: 2 };
const OFFSET = [3, 2.5] as const;

/** Every beat of one peek shares this loop, so they stay in step. */
const BEAT = 18;
/** Starts the loop partway through, so the first beat comes a few seconds after the page opens. */
const FIRST_BEAT = 12;

type BeatProps = { kind: Parameters<typeof Motion>[0]["kind"]; children: ReactNode };

function Beat({ kind, children }: BeatProps) {
  return (
    <Motion kind={kind} duration={BEAT} phase={FIRST_BEAT}>
      {children}
    </Motion>
  );
}

/** Lobyaq's job: holds up an answer slip and ticks it. */
function TickSlip() {
  return (
    <g transform="rotate(6 114 36)">
      <Shape
        d={box(100, 22, 28, 26, { seed: 5, bow: 2 })}
        color={YELLOW}
        stroke={WEIGHT.detail}
        offset={[2.5, 2.5]}
      />
      <Beat kind="peek-mark">
        <Line d="M107 35L112 40L121 30" stroke={WEIGHT.detail} drawable />
      </Beat>
    </g>
  );
}

/** Lobyar's job: holds up an open book and turns a page. */
function TurnPage() {
  return (
    <g>
      <Shape
        d={quad([
          [94, 28],
          [112, 32],
          [112, 50],
          [94, 46],
        ])}
        color={YELLOW}
        stroke={WEIGHT.detail}
        offset={[2.5, 2.5]}
      />
      <Shape
        d={quad([
          [112, 32],
          [130, 28],
          [130, 46],
          [112, 50],
        ])}
        color={YELLOW}
        stroke={WEIGHT.detail}
        offset={[2.5, 2.5]}
      />
      <Motion kind="peek-page" duration={BEAT} phase={FIRST_BEAT} pivot={[112, 40]}>
        <Shape
          d={quad([
            [112, 32],
            [128, 29],
            [128, 46],
            [112, 49],
          ])}
          stroke={WEIGHT.fine}
          offset={[0, 0]}
        />
      </Motion>
    </g>
  );
}

/** Lobyare's job: holds up a flashcard and flips it over. */
function FlipCard() {
  return (
    <g transform="rotate(-6 114 36)">
      <Beat kind="peek-flip-front">
        <Shape
          d={box(100, 22, 28, 28, { seed: 7, bow: 2 })}
          color={YELLOW}
          stroke={WEIGHT.detail}
          offset={[2.5, 2.5]}
        />
      </Beat>
      <Beat kind="peek-flip-back">
        <Shape
          d={box(100, 22, 28, 28, { seed: 4, bow: 2 })}
          color={BLUE}
          stroke={WEIGHT.detail}
          offset={[2.5, 2.5]}
        />
        <Line d={wave(105, 36, 16, { amp: 2, period: 8, seed: 2 })} stroke={WEIGHT.fine} />
      </Beat>
    </g>
  );
}

/** Triage's job: holds up a card, then sends it off to the pile. */
function SortCard() {
  return (
    <Beat kind="peek-sort">
      <g transform="rotate(4 114 36)">
        <Shape
          d={box(100, 22, 28, 28, { seed: 9, bow: 2 })}
          color={BLUE}
          stroke={WEIGHT.detail}
          offset={[2.5, 2.5]}
        />
        <Line d={wave(105, 36, 16, { amp: 2, period: 8, seed: 3 })} stroke={WEIGHT.fine} />
      </g>
    </Beat>
  );
}

/** Mastery's job: holds up a little chart and one bar grows. */
function GrowBar() {
  return (
    <g>
      <Shape d={box(98, 20, 32, 30, { seed: 6, bow: 2 })} stroke={WEIGHT.detail} offset={[0, 0]} />
      <Shape d={box(103, 38, 6, 8, { seed: 2, bow: 1 })} color={CORAL} stroke={WEIGHT.fine} />
      <Shape d={box(111, 33, 6, 13, { seed: 3, bow: 1 })} color={PURPLE} stroke={WEIGHT.fine} />
      <Motion kind="peek-grow" duration={BEAT} phase={FIRST_BEAT} origin="50% 100%">
        <Shape d={box(119, 26, 6, 20, { seed: 4, bow: 1 })} color={BLUE} stroke={WEIGHT.fine} />
      </Motion>
    </g>
  );
}

/** Capture's job: holds up a note and writes a line on it. */
function WriteNote() {
  return (
    <g transform="rotate(-4 114 36)">
      <Shape
        d={box(98, 22, 32, 26, { seed: 8, bow: 2 })}
        color={CORAL}
        stroke={WEIGHT.detail}
        offset={[2.5, 2.5]}
      />
      <Beat kind="peek-mark">
        <Line d={wave(103, 33, 22, { amp: 2, period: 8, seed: 5 })} stroke={WEIGHT.fine} drawable />
      </Beat>
      <Line d="M104 41L118 41" stroke={WEIGHT.fine} />
    </g>
  );
}

/**
 * Who peeks on each page. The study tabs use the Goals lobyas (Lobyar reads,
 * Lobyare reviews, Lobyaq quizzes); the shared pages use unnamed yellow ones.
 */
const PEEKERS = {
  read: { ...GOAL_LOBYAS.read, job: TurnPage },
  review: { ...GOAL_LOBYAS.review, job: FlipCard },
  quiz: { ...GOAL_LOBYAS.quiz, job: TickSlip },
  triage: { color: YELLOW, seed: 11, job: SortCard },
  mastery: { color: YELLOW, seed: 14, job: GrowBar },
  capture: { color: YELLOW, seed: 21, job: WriteNote },
} as const;

export type Peeker = keyof typeof PEEKERS;

/**
 * A lobya peeking over the top edge of a page's main card. It blinks, and
 * now and then holds up its prop and does its job in one move. The bottom of
 * the drawing is the card's edge, so sit it flush on top of the card.
 */
export function StudyPeekScene({ who, className }: { who: Peeker; className?: string }) {
  const { color, seed, job: Job } = PEEKERS[who];

  return (
    <Illustration viewBox="0 0 140 64" className={className}>
      <Shape
        offset={OFFSET}
        stroke={WEIGHT.body}
        d={blob({ cx: 56, cy: 64, rx: 32, ry: 40, taper: 0.1, seed })}
        color={color}
      />
      <Beat kind="peek-glance">
        <Motion kind="blink" phase={seed * 0.3}>
          <Eye x={48} y={42} r={3.6} />
          <Eye x={63} y={40} r={3.6} />
        </Motion>
      </Beat>
      <Line d="M48 50Q56 56 64 50" stroke={WEIGHT.detail} />
      <Shape
        offset={[2, 2]}
        stroke={WEIGHT.detail}
        d={blob({ cx: 26, cy: 60, rx: 7, ry: 5, seed: seed + 1 })}
        color={color}
      />
      <Shape
        offset={[2, 2]}
        stroke={WEIGHT.detail}
        d={blob({ cx: 86, cy: 60, rx: 7, ry: 5, seed: seed + 2 })}
        color={color}
      />
      <Beat kind="peek-rise">
        <Job />
      </Beat>
      <Beat kind="peek-spark">
        <Spark x={132} y={12} r={8} rays={4} rotate={20} />
      </Beat>
    </Illustration>
  );
}
