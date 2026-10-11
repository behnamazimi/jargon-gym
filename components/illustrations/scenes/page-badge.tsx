import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { blob, box, quad, wave } from "../geometry";
import { Illustration } from "../illustration";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Line, Shape } from "../shape";
import { GoalProp } from "./goal-team";

/** Thin ink, as these draw at about 30px. */
const WEIGHT = { body: 3.4, detail: 2.6, fine: 2 };
const OFFSET = [3, 3] as const;
/** The props are drawn small, so they're scaled up to keep the marker wobble as subtle as in a full scene. */
const SCALE = 3;

/** One inked piece with its colour printed slightly off. */
function Piece({ d, color }: { d: string; color?: string }) {
  return <Shape d={d} color={color} stroke={WEIGHT.detail} offset={color ? OFFSET : [0, 0]} />;
}

/** Two cards piled up on one side, one sorted onto the other with a tick. */
function SortedPiles() {
  return (
    <g>
      <Shape
        d={box(22, 46, 26, 30, { seed: 3, bow: 2 })}
        color={YELLOW}
        stroke={WEIGHT.detail}
        offset={OFFSET}
      />
      <Shape
        d={box(26, 40, 26, 30, { seed: 5, bow: 2 })}
        color={YELLOW}
        stroke={WEIGHT.detail}
        offset={OFFSET}
      />
      <g transform="rotate(8 68 52)">
        <Shape
          d={box(56, 36, 26, 30, { seed: 7, bow: 2 })}
          color={BLUE}
          stroke={WEIGHT.detail}
          offset={OFFSET}
        />
        <Line d="M62 51L67 56L76 46" stroke={WEIGHT.detail} />
      </g>
    </g>
  );
}

/** A target with a dart in the middle. */
function Target() {
  return (
    <g>
      <Shape
        d={blob({ cx: 48, cy: 54, rx: 26, seed: 4 })}
        color={CORAL}
        stroke={WEIGHT.detail}
        offset={OFFSET}
      />
      <Shape d={blob({ cx: 48, cy: 54, rx: 16, seed: 6 })} stroke={WEIGHT.detail} offset={[0, 0]} />
      <Shape
        d={blob({ cx: 48, cy: 54, rx: 6, seed: 2 })}
        color={CORAL}
        stroke={WEIGHT.detail}
        offset={[2, 2]}
      />
      <Line d="M50 52L76 26" stroke={WEIGHT.detail} />
      <Line d="M72 24L78 24L78 30M76 20L82 20L82 26" stroke={WEIGHT.fine} />
    </g>
  );
}

/** Three bars climbing on a baseline. */
function RisingBars() {
  return (
    <g>
      <Shape
        d={box(26, 58, 12, 16, { seed: 2, bow: 1 })}
        color={CORAL}
        stroke={WEIGHT.detail}
        offset={OFFSET}
      />
      <Shape
        d={box(44, 44, 12, 30, { seed: 3, bow: 1 })}
        color={PURPLE}
        stroke={WEIGHT.detail}
        offset={OFFSET}
      />
      <Shape
        d={box(62, 28, 12, 46, { seed: 4, bow: 1 })}
        color={BLUE}
        stroke={WEIGHT.detail}
        offset={OFFSET}
      />
      <Line d="M20 76L82 76" stroke={WEIGHT.detail} />
    </g>
  );
}

/** A magnifying glass over a card. */
function Magnifier() {
  return (
    <g>
      <g transform="rotate(-6 42 50)">
        <Shape
          d={box(22, 28, 38, 46, { seed: 8, bow: 2 })}
          color={YELLOW}
          stroke={WEIGHT.detail}
          offset={OFFSET}
        />
        <Line d={wave(28, 42, 22, { amp: 2, period: 8, seed: 3 })} stroke={WEIGHT.fine} />
        <Line d="M28 52L46 52" stroke={WEIGHT.fine} />
      </g>
      <Line d="M68 66L82 80" stroke={WEIGHT.body + 1} />
      <Shape
        d={blob({ cx: 60, cy: 58, rx: 14, seed: 5 })}
        color={BLUE}
        stroke={WEIGHT.detail}
        offset={[2, 2]}
      />
    </g>
  );
}

/** Two sliders, for Settings. The tracks are filled so they still show on a dark badge. */
function Sliders() {
  return (
    <g>
      <Piece d={box(16, 32, 68, 8, { seed: 2, bow: 1 })} />
      <Piece d={box(16, 60, 68, 8, { seed: 3, bow: 1 })} />
      <Piece d={blob({ cx: 38, cy: 36, rx: 9, seed: 3 })} color={CORAL} />
      <Piece d={blob({ cx: 64, cy: 64, rx: 9, seed: 5 })} color={BLUE} />
    </g>
  );
}

/** A card dropping into an open box: a new collection. */
function CardIntoBox() {
  return (
    <g>
      <g transform="rotate(-10 52 36)">
        <Piece d={box(40, 18, 24, 32, { seed: 4, bow: 2 })} color={BLUE} />
      </g>
      <Piece d={box(24, 48, 52, 32, { seed: 6, bow: 2 })} color={YELLOW} />
      <Line d="M24 48L14 38M76 48L86 38" stroke={WEIGHT.detail} />
    </g>
  );
}

/** A clipboard with a list on it. */
function Clipboard() {
  return (
    <g>
      <Piece d={box(28, 22, 44, 58, { seed: 5, bow: 2 })} color={YELLOW} />
      <Piece d={box(40, 16, 20, 12, { seed: 2, bow: 1 })} color={PURPLE} />
      <Line d="M36 42L62 42M36 53L58 53M36 64L54 64" stroke={WEIGHT.fine} />
    </g>
  );
}

/** A card hopping from one deck to another: bringing terms over from another app. */
function MoveBetween() {
  return (
    <g>
      <g transform="rotate(-6 31 52)">
        <Piece d={box(16, 34, 30, 38, { seed: 3, bow: 2 })} color={CORAL} />
      </g>
      <g transform="rotate(6 71 50)">
        <Piece d={box(56, 32, 30, 38, { seed: 7, bow: 2 })} color={BLUE} />
      </g>
      <Line d="M30 26Q48 8 66 22M60 16L67 23L58 26" stroke={WEIGHT.detail} />
    </g>
  );
}

/** A few different things to add, with a plus. */
function MoreWays() {
  return (
    <g>
      <g transform="rotate(-8 30 56)">
        <Piece d={box(18, 42, 24, 30, { seed: 4, bow: 2 })} color={YELLOW} />
      </g>
      <Piece d={blob({ cx: 54, cy: 60, rx: 11, seed: 6 })} color={CORAL} />
      <g transform="rotate(8 78 52)">
        <Piece d={box(70, 40, 16, 24, { seed: 2, bow: 1 })} color={BLUE} />
      </g>
      <Line d="M50 18L50 34M42 26L58 26" stroke={WEIGHT.detail} />
    </g>
  );
}

/** A sealed envelope: a request sent off. */
function Envelope() {
  return (
    <g>
      <Piece d={box(18, 30, 64, 42, { seed: 5, bow: 2 })} color={YELLOW} />
      <Line d="M18 31L50 55L82 31" stroke={WEIGHT.detail} />
    </g>
  );
}

/** A card with a pencil writing on it: one new term. */
function CardAndPencil() {
  return (
    <g>
      <Piece d={box(16, 32, 48, 40, { seed: 6, bow: 2 })} color={YELLOW} />
      <Line d={wave(22, 48, 26, { amp: 2, period: 8, seed: 4 })} stroke={WEIGHT.fine} />
      <Line d="M22 58L40 58" stroke={WEIGHT.fine} />
      <Piece
        d={quad([
          [70, 18],
          [82, 24],
          [62, 62],
          [52, 56],
        ])}
        color={CORAL}
      />
      <Line d="M52 56L54 66L62 62" stroke={WEIGHT.detail} />
    </g>
  );
}

/** A document with a seal, for the legal pages. */
function SealedPage() {
  return (
    <g>
      <Piece d={box(28, 16, 40, 56, { seed: 3, bow: 2 })} />
      <Line d="M36 30L60 30M36 40L60 40M36 50L52 50" stroke={WEIGHT.fine} />
      <Piece d={blob({ cx: 64, cy: 66, rx: 11, seed: 4 })} color={CORAL} />
    </g>
  );
}

/** A speech bubble, for Contact. */
function SpeechBubble() {
  return (
    <g>
      <Piece d={blob({ cx: 50, cy: 44, rx: 32, ry: 22, seed: 5 })} color={BLUE} />
      <Line d="M36 62L30 76L48 65" stroke={WEIGHT.detail} />
      <Line d="M38 45L38 45M50 45L50 45M62 45L62 45" stroke={WEIGHT.body + 2} />
    </g>
  );
}

/** A frame in the drawing's own units (0 to 100), scaled up like the drawing. */
const frame = (x: number, y: number, w: number, h: number) =>
  [x, y, w, h].map((n) => n * SCALE).join(" ");

/** What each page's badge shows, and how tightly to frame it. */
const BADGES = {
  read: {
    tint: CORAL,
    viewBox: frame(22, 34, 60, 38),
    art: <GoalProp tier="read" x={50} y={50} />,
  },
  review: {
    tint: PURPLE,
    viewBox: frame(24, 8, 56, 76),
    art: <GoalProp tier="review" x={50} y={56} />,
  },
  quiz: { tint: BLUE, viewBox: frame(24, 28, 56, 46), art: <GoalProp tier="quiz" x={50} y={50} /> },
  triage: { tint: YELLOW, viewBox: frame(16, 30, 72, 54), art: <SortedPiles /> },
  goals: { tint: CORAL, viewBox: frame(16, 14, 72, 72), art: <Target /> },
  mastery: { tint: PURPLE, viewBox: frame(16, 22, 72, 60), art: <RisingBars /> },
  browse: { tint: BLUE, viewBox: frame(16, 20, 72, 66), art: <Magnifier /> },
  settings: { tint: PURPLE, viewBox: frame(10, 20, 80, 60), art: <Sliders /> },
  import: { tint: YELLOW, viewBox: frame(8, 10, 84, 76), art: <CardIntoBox /> },
  paste: { tint: BLUE, viewBox: frame(18, 10, 64, 76), art: <Clipboard /> },
  apps: { tint: CORAL, viewBox: frame(8, 4, 86, 74), art: <MoveBetween /> },
  more: { tint: PURPLE, viewBox: frame(10, 12, 82, 66), art: <MoreWays /> },
  request: { tint: YELLOW, viewBox: frame(12, 22, 76, 56), art: <Envelope /> },
  capture: { tint: CORAL, viewBox: frame(10, 12, 80, 66), art: <CardAndPencil /> },
  legal: { tint: BLUE, viewBox: frame(20, 10, 62, 74), art: <SealedPage /> },
  contact: { tint: CORAL, viewBox: frame(12, 16, 76, 66), art: <SpeechBubble /> },
} satisfies Record<string, { tint: string; viewBox: string; art: ReactNode }>;

/**
 * The round badge beside a page title on desktop: a small drawing of what the
 * page is for, on a circle tinted to match. Like the brand icon, the drawing
 * keeps its light colours on the dark theme; only the tint follows it.
 */
type Page = keyof typeof BADGES;

export function PageBadge({ page, className }: { page: Page; className?: string }) {
  const { tint, viewBox, art } = BADGES[page];
  return (
    <span
      className={cn(
        "ill-mark flex size-11 shrink-0 items-center justify-center rounded-full",
        className,
      )}
      style={{ background: `color-mix(in oklab, ${tint} 28%, var(--color-base-100))` }}
      aria-hidden
    >
      <Illustration viewBox={viewBox} className="max-h-[62%] w-[64%]">
        <g transform={`scale(${SCALE})`}>{art}</g>
      </Illustration>
    </span>
  );
}
