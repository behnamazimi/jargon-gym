import { blob, box, curve, quad, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dashes, Dot, DottedPath, Eye, ScribbleLines, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

/**
 * Two ways back to your terms. Left, a schedule-driven app: buried under a
 * growing pile of overdue cards with the alarm going off. Right, no due dates:
 * sitting down with a coffee and reviewing a small, tidy stack at their own pace.
 */
export function NoDueDatesScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <DottedPath d="M400 120L402 540" />
      <OverduePile />
      <CalmReview />
    </Illustration>
  );
}

type PileCard = { x: number; y: number; tilt: number; color?: string };

// Back rows first: each row down the heap sits in front of the one above it.
const PILE_ROWS: PileCard[][] = [
  [
    { x: 196, y: 412, tilt: -8 },
    { x: 256, y: 416, tilt: 10, color: PURPLE },
  ],
  [
    { x: 160, y: 446, tilt: 12, color: BLUE },
    { x: 222, y: 444, tilt: -4 },
    { x: 284, y: 450, tilt: -14 },
  ],
  [
    { x: 126, y: 482, tilt: -10 },
    { x: 186, y: 478, tilt: 6, color: YELLOW },
    { x: 248, y: 480, tilt: -6 },
    { x: 306, y: 486, tilt: 12, color: BLUE },
  ],
];
const PILE_FRONT: PileCard[] = [
  { x: 104, y: 518, tilt: 8, color: PURPLE },
  { x: 164, y: 520, tilt: -5 },
  { x: 228, y: 522, tilt: 4, color: BLUE },
  { x: 290, y: 518, tilt: -9 },
  { x: 344, y: 522, tilt: 6, color: YELLOW },
];
// Where the falling cards land on the heap.
const LANDING: PileCard[] = [
  { x: 150, y: 418, tilt: -18, color: YELLOW },
  { x: 302, y: 420, tilt: 16 },
];

function PileCardShape({ x, y, tilt, color, seed }: PileCard & { seed: number }) {
  return (
    <g transform={`rotate(${tilt} ${x} ${y})`}>
      <Shape d={box(x - 31, y - 21, 62, 42, { seed })} color={color} stroke={STROKE.regular} />
      <ScribbleLines x={x - 19} y={y - 7} width={38} lines={2} gap={12} seed={seed + 20} />
    </g>
  );
}

function OverduePile() {
  return (
    <g>
      <Line d={wave(60, 542, 320, { amp: 2, period: 40, seed: 2 })} stroke={STROKE.regular} />
      {PILE_ROWS.flat().map((card, i) => (
        <PileCardShape key={`${card.x}-${card.y}`} {...card} seed={i + 1} />
      ))}

      {/* More cards keep coming due and landing on the heap. */}
      {LANDING.map((card, i) => (
        <Motion key={card.x} kind="drop" phase={i * 1.2}>
          <PileCardShape {...card} seed={30 + i} />
        </Motion>
      ))}

      <AlarmClock />

      {/* Buried up to the chin, sweating. */}
      <Shape d={blob({ cx: 206, cy: 464, rx: 34, ry: 32, seed: 4 })} color={CORAL} />
      <Line d="M184 445L197 439M215 438L228 444" stroke={STROKE.regular} />
      <Eye x={196} y={454} />
      <Eye x={219} y={453} />
      <Line d={wave(196, 474, 22, { amp: 2, period: 8, seed: 3 })} stroke={STROKE.fine} />
      <Motion kind="drip">
        <SweatDrop x={248} y={438} />
      </Motion>
      <Motion kind="drip" phase={0.8}>
        <SweatDrop x={166} y={444} />
      </Motion>

      {PILE_FRONT.map((card, i) => (
        <PileCardShape key={card.x} {...card} seed={10 + i} />
      ))}
    </g>
  );
}

function AlarmClock() {
  return (
    <g>
      {/* Ringing: it rattles in bursts, with ring marks on each burst. */}
      <Motion kind="ring">
        <Dashes x={168} y={340} angle={180} count={3} length={16} />
        <Dashes x={284} y={340} angle={0} count={3} length={16} />
      </Motion>
      <Motion kind="shake" origin="50% 100%">
        <Line d="M206 386L198 398M244 386L252 398" />
        <Shape
          d={blob({ cx: 202, cy: 318, rx: 14, ry: 11, seed: 2 })}
          color={CORAL}
          stroke={STROKE.regular}
        />
        <Shape
          d={blob({ cx: 248, cy: 318, rx: 14, ry: 11, seed: 3 })}
          color={CORAL}
          stroke={STROKE.regular}
        />
        <Line d="M225 320L225 306" stroke={STROKE.regular} />
        <Shape
          d={blob({ cx: 225, cy: 355, rx: 36, seed: 5, wobble: 0.03, points: 12 })}
          color={YELLOW}
        />
        <Shape d={blob({ cx: 225, cy: 355, rx: 24, seed: 6, wobble: 0.03 })} stroke={STROKE.fine} />
        <Line d="M225 355L225 338M225 355L238 362" stroke={STROKE.regular} />
      </Motion>
    </g>
  );
}

function SweatDrop({ x, y }: { x: number; y: number }) {
  return (
    <Shape
      d={`M${x} ${y - 9}Q${x + 8} ${y + 2} ${x} ${y + 7}Q${x - 8} ${y + 2} ${x} ${y - 9}Z`}
      color={BLUE}
      stroke={STROKE.fine}
      offset={[2, 2]}
    />
  );
}

function CalmReview() {
  return (
    <g>
      <Line d={wave(430, 542, 310, { amp: 2, period: 40, seed: 5 })} stroke={STROKE.regular} />

      {/* The rest of the stack, waiting on the table with no hurry. */}
      <Line d="M592 470L588 540M728 466L734 540" />
      <Shape
        d={quad(
          [
            [580, 456],
            [740, 452],
            [742, 468],
            [578, 472],
          ],
          { seed: 7, bow: 1 },
        )}
        color={BLUE}
      />
      <g transform="rotate(5 690 434)">
        <Shape d={box(658, 412, 64, 44, { seed: 8 })} color={PURPLE} stroke={STROKE.regular} />
      </g>
      <g transform="rotate(-3 684 432)">
        <Shape d={box(652, 410, 64, 44, { seed: 9 })} color={YELLOW} stroke={STROKE.regular} />
      </g>
      <g transform="rotate(1 680 430)">
        <Shape d={box(648, 408, 64, 44, { seed: 10 })} stroke={STROKE.regular} />
        <ScribbleLines x={660} y={422} width={40} lines={2} gap={12} seed={9} />
      </g>
      <Motion kind="twinkle" phase={0.6}>
        <Spark x={748} y={392} r={18} rotate={10} />
      </Motion>

      {/* Sitting down to review: reads the card, nods along, takes a sip of coffee. */}
      <Shape d={box(456, 486, 86, 14, { seed: 12, bow: 1 })} color={YELLOW} />
      <Line d="M466 500L460 540M532 500L538 540" />
      <Line d="M490 478L530 486L528 526M502 480L542 490L541 528" />
      <Line d="M528 527L542 527M541 529L555 529" stroke={9} />

      <Motion kind="nod" origin="50% 100%">
        <Motion kind="sip" pivot={[474, 428]}>
          <Line
            d={curve([
              [474, 428],
              [498, 462],
              [520, 464],
            ])}
          />
        </Motion>
        <Line
          d={curve([
            [526, 428],
            [558, 432],
            [566, 402],
          ])}
        />
        <Shape d={blob({ cx: 496, cy: 420, rx: 40, ry: 62, taper: 0.12, seed: 11 })} color={BLUE} />
        <Hatch d={blob({ cx: 478, cy: 456, rx: 13, ry: 10, seed: 3 })} />
        <Motion kind="blink" phase={1.3}>
          <Motion kind="look" amount={3} duration={1.2}>
            <Eye x={510} y={392} />
            <Eye x={528} y={390} />
          </Motion>
        </Motion>
        <Line d="M510 410Q520 418 532 408" stroke={STROKE.regular} />

        <g transform="rotate(-10 587 374)">
          <Shape d={box(556, 352, 62, 44, { seed: 13 })} stroke={STROKE.regular} />
          <ScribbleLines x={567} y={366} width={40} lines={2} gap={12} seed={14} />
        </g>
        <Dot x={566} y={400} r={7} color={BLUE} />

        <Motion kind="sip" pivot={[474, 428]}>
          <Motion kind="steam">
            <Line d="M530 448Q524 442 530 436Q536 430 530 424" stroke={STROKE.fine} />
          </Motion>
          <Motion kind="steam" phase={0.9}>
            <Line d="M541 446Q535 440 541 434Q547 428 541 422" stroke={STROKE.fine} />
          </Motion>
          <Line d="M522 458C512 458 512 472 522 472" stroke={STROKE.regular} />
          <Shape
            d={box(522, 452, 26, 28, { seed: 15, bow: 1 })}
            color={CORAL}
            stroke={STROKE.regular}
          />
        </Motion>
      </Motion>
    </g>
  );
}
