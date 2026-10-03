import { blob, box, curve, quad, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dashes, Dot, DottedPath, Eye, ScribbleLines, Spark, Squiggle } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

/** Three tiny people working one giant term card: one reads it, one quizzes, one reviews. */
export function ReadReviewQuizScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Squiggle x={70} y={150} width={80} rotate={-12} seed={4} />
      <Motion kind="twinkle">
        <Spark x={95} y={265} r={18} rotate={10} />
      </Motion>
      <Dot x={170} y={175} r={7} color={YELLOW} />
      <Dot x={745} y={470} r={9} color={BLUE} ring />
      <Dot x={700} y={95} r={6} color={CORAL} />

      <Shape
        d={quad(
          [
            [268, 126],
            [602, 138],
            [598, 418],
            [256, 410],
          ],
          { seed: 9 },
        )}
      />
      <Hatch d={blob({ cx: 572, cy: 170, rx: 18, ry: 24, seed: 2 })} />

      <g transform="translate(18 0)">
        <Ladder />
      </g>

      <Shape
        d={quad(
          [
            [232, 158],
            [568, 146],
            [580, 440],
            [224, 448],
          ],
          { seed: 3, bow: 5 },
        )}
        color={YELLOW}
      />
      <Line d={wave(300, 212, 170, { amp: 3, period: 30, seed: 5 })} stroke={9} />
      <ScribbleLines x={384} y={262} width={160} lines={4} gap={24} seed={11} />
      <Shape d={box(258, 388, 78, 26, { seed: 6, bow: 2 })} color={BLUE} stroke={STROKE.regular} />
      <Hatch d={blob({ cx: 528, cy: 402, rx: 30, ry: 17, seed: 8 })} cross />

      <g transform="translate(18 0)">
        <Reader />
      </g>
      <QuizFigure />
      <ReviewFigure />
    </Illustration>
  );
}

function Ladder() {
  const rails = [
    [130, 545, 185, 330],
    [178, 545, 233, 330],
  ] as const;
  const rungs = [0.15, 0.48, 0.8];
  const at = (rail: (typeof rails)[number], t: number) =>
    [rail[0] + (rail[2] - rail[0]) * t, rail[1] + (rail[3] - rail[1]) * t] as const;

  return (
    <g>
      <Line d={wave(105, 552, 150, { amp: 2, period: 40, seed: 3 })} stroke={STROKE.regular} />
      {rails.map((rail) => (
        <Line key={rail[0]} d={`M${rail[0]} ${rail[1]}L${rail[2]} ${rail[3]}`} />
      ))}
      {rungs.map((t) => {
        const [ax, ay] = at(rails[0], t);
        const [bx, by] = at(rails[1], t);
        return <Line key={t} d={`M${ax} ${ay}L${bx} ${by}`} stroke={STROKE.regular} />;
      })}
    </g>
  );
}

function Reader() {
  return (
    <g>
      <Line
        d={curve([
          [194, 326],
          [190, 350],
          [192, 370],
        ])}
      />
      <Line
        d={curve([
          [208, 326],
          [213, 350],
          [212, 369],
        ])}
      />
      <Line d="M188 372L202 372M209 370L222 370" stroke={9} />

      {/* Reads along the line: the arm reaches out from behind the body, the eyes follow. */}
      <Motion kind="scan">
        <Line
          d={curve([
            [214, 285],
            [242, 310],
            [252, 334],
          ])}
        />
        <Line d="M250 342L276 314" stroke={11} />
        <Shape d={blob({ cx: 302, cy: 288, rx: 44, seed: 3, wobble: 0.02, points: 12 })} />
        <Line d={wave(272, 280, 58, { amp: 3, period: 24, seed: 2 })} stroke={7} />
        <Line d={wave(272, 302, 38, { amp: 3, period: 24, seed: 6 })} stroke={7} />
        <Line
          d={curve([
            [276, 262],
            [288, 254],
            [302, 252],
          ])}
          stroke={STROKE.fine}
        />
      </Motion>

      <Motion kind="breathe" origin="50% 100%" phase={0.5}>
        <Shape d={blob({ cx: 198, cy: 268, rx: 34, ry: 60, taper: 0.15, seed: 12 })} color={BLUE} />
        <Line d="M190 212L186 196M200 210L201 193M210 213L216 198" stroke={STROKE.regular} />
        <Motion kind="blink">
          <Motion kind="scan" amount={4}>
            <Eye x={208} y={244} />
            <Eye x={225} y={242} />
          </Motion>
        </Motion>
        <Dot x={219} y={262} r={4.5} ring />
      </Motion>
      <Line
        d={curve([
          [170, 280],
          [160, 302],
          [166, 326],
        ])}
      />
      <Dashes x={268} y={236} angle={-120} count={3} length={14} />
    </g>
  );
}

function QuizFigure() {
  return (
    <g>
      {/* Quizzes itself: reads the question side, thinks, flips the card to a check
          mark, hops with a fist pump, flips it back for the next go. */}
      <Motion kind="cheer">
        <Line d="M408 147L404 180M434 147L440 179" />
        <Line d="M397 181L408 181M437 180L449 181" stroke={9} />
        <Motion kind="cheer-arm" pivot={[386, 116]}>
          <Line
            d={curve([
              [386, 116],
              [366, 126],
              [352, 116],
            ])}
          />
        </Motion>
        <Line d="M454 118L480 110" />
        <Shape d={blob({ cx: 421, cy: 113, rx: 40, ry: 38, seed: 21 })} color={PURPLE} />
        <Motion kind="blink" phase={1.7}>
          <Motion kind="think">
            <Eye x={428} y={104} />
            <Eye x={447} y={102} />
          </Motion>
        </Motion>
        <Line
          d={curve([
            [423, 122],
            [436, 131],
            [450, 119],
          ])}
          stroke={STROKE.regular}
        />

        <Motion kind="flip-front">
          <Shape d={box(482, 80, 62, 44, { seed: 4, bow: 2 })} stroke={STROKE.regular} />
          <ScribbleLines x={493} y={93} width={40} lines={3} gap={10} seed={7} />
        </Motion>
        <Motion kind="flip-back">
          <Shape
            d={box(482, 80, 62, 44, { seed: 4, bow: 2 })}
            color={BLUE}
            stroke={STROKE.regular}
          />
          <Line d="M498 102L509 113L529 89" stroke={7} />
        </Motion>
        <Shape
          d={blob({ cx: 482, cy: 110, rx: 8, seed: 14 })}
          color={PURPLE}
          stroke={STROKE.regular}
        />
      </Motion>

      <Motion kind="cheer-flash">
        <Spark x={572} y={86} r={22} rotate={-20} />
      </Motion>
      <Motion kind="cheer-flash" phase={0.08}>
        <Spark x={350} y={62} r={16} rotate={10} />
      </Motion>
    </g>
  );
}

// Where the reviewed card is held, and the arc it flies along to the pile.
// The flight offsets in the ill-toss-card keyframes trace these same points.
const HELD_CARD = { x: 641, y: 378 };
const TOSS_ARC = [
  [641, 370],
  [671, 306],
  [709, 284],
  [736, 318],
  [747, 398],
  [748, 470],
] as const;
const PILE = [
  { x: 748, y: 526, tilt: -6, color: PURPLE },
  { x: 751, y: 515, tilt: 5, color: BLUE },
  { x: 747, y: 505, tilt: -2, color: undefined },
];

function ReviewCard({ x, y, color, seed }: { x: number; y: number; color?: string; seed: number }) {
  return (
    <g>
      <Shape d={box(x - 30, y - 21, 60, 42, { seed })} color={color} stroke={STROKE.regular} />
      <ScribbleLines x={x - 18} y={y - 7} width={36} lines={2} gap={12} seed={seed + 10} />
    </g>
  );
}

function ReviewFigure() {
  return (
    <g>
      <DottedPath moving d={curve(TOSS_ARC)} />
      <Dashes x={752} y={262} angle={60} count={3} length={16} />

      <Line d={wave(580, 553, 210, { amp: 2, period: 40, seed: 9 })} stroke={STROKE.regular} />
      {PILE.map(({ x, y, tilt, color }, i) => (
        <g key={y} transform={`rotate(${tilt} ${x} ${y})`}>
          <ReviewCard x={x} y={y} color={color} seed={60 + i} />
        </g>
      ))}

      {/* Reviews a card: reads it overhead, winds up, throws it onto the done pile,
          watches it land, and the next card is already in hand. */}
      <Line d="M618 528L612 549M660 528L668 549" />
      <Line d="M600 550L614 550M666 550L680 550" />
      <Motion kind="toss" origin="50% 100%">
        <Motion kind="toss-arm" pivot={[614, 450]} mirror>
          <Line
            d={curve([
              [614, 450],
              [604, 422],
              [616, 398],
            ])}
          />
        </Motion>
        <Motion kind="toss-arm" pivot={[668, 448]}>
          <Line
            d={curve([
              [668, 448],
              [678, 422],
              [666, 397],
            ])}
          />
        </Motion>
        <Shape
          d={blob({ cx: 640, cy: 482, rx: 64, ry: 52, taper: 0.12, seed: 31 })}
          color={CORAL}
        />
        <Hatch d={blob({ cx: 672, cy: 505, rx: 18, ry: 12, seed: 6 })} />
        <Motion kind="blink" phase={3.1}>
          <Motion kind="toss-eyes">
            <Eye x={626} y={466} />
            <Eye x={653} y={463} />
          </Motion>
        </Motion>
        <Dot x={640} y={492} r={8} />
      </Motion>
      <Motion kind="toss-card">
        <ReviewCard x={HELD_CARD.x} y={HELD_CARD.y} seed={40} />
      </Motion>
    </g>
  );
}
