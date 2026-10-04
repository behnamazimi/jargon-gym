import { blob, box, curve, polyline, wave, type Point } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, DottedPath, Eye, ScribbleLines, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Line, Shape, STROKE } from "../shape";

const POLE_X = 540;

const SIGNS: { points: Point[]; color: string; lines: [number, number] }[] = [
  {
    points: [
      [POLE_X, 206],
      [670, 206],
      [696, 232],
      [670, 258],
      [POLE_X, 258],
    ],
    color: YELLOW,
    lines: [556, 226],
  },
  {
    points: [
      [POLE_X, 272],
      [420, 272],
      [394, 298],
      [420, 324],
      [POLE_X, 324],
    ],
    color: BLUE,
    lines: [428, 292],
  },
  {
    points: [
      [POLE_X, 340],
      [650, 340],
      [676, 364],
      [650, 388],
      [POLE_X, 388],
    ],
    color: PURPLE,
    lines: [556, 358],
  },
];

/** Looking at the whole map before setting off: a reader with an unfolded map by a signpost. */
export function BeforeYouSignUpScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Motion kind="twinkle">
        <Spark x={180} y={180} r={18} rotate={4} />
      </Motion>
      <Motion kind="twinkle" phase={1.3}>
        <Spark x={720} y={150} r={16} rotate={-8} />
      </Motion>
      <Dot x={380} y={170} r={7} color={CORAL} ring />
      <Dot x={300} y={250} r={5} color={YELLOW} />

      <Line d={wave(130, 524, 590, { amp: 2, period: 44, seed: 4 })} stroke={STROKE.regular} />
      <DottedPath
        d={curve([
          [320, 556],
          [430, 566],
          [POLE_X, 548],
        ])}
        moving
      />

      <Line d={`M${POLE_X} 524L${POLE_X} 192`} stroke={STROKE.bold} />
      {SIGNS.map((sign, i) => (
        <g key={sign.color}>
          <Shape d={polyline(sign.points, true)} color={sign.color} />
          <ScribbleLines
            x={sign.lines[0]}
            y={sign.lines[1]}
            width={90}
            lines={2}
            gap={14}
            seed={i + 2}
          />
        </g>
      ))}

      {/* The reader, following the route across the map. */}
      <Line d="M228 500L222 524M270 500L276 524" />
      <Shape d={blob({ cx: 250, cy: 418, rx: 62, ry: 88, taper: 0.1, seed: 5 })} color={CORAL} />
      <Motion kind="blink" phase={2}>
        <Motion kind="scan" amount={4}>
          <Eye x={248} y={378} />
          <Eye x={270} y={376} />
        </Motion>
      </Motion>
      <Line d="M254 398Q263 404 272 398" stroke={STROKE.regular} />

      <Line d="M206 430Q232 452 262 446M296 430Q312 446 330 444" />
      <g transform="rotate(-6 320 440)">
        <Shape d={box(250, 408, 140, 84, { seed: 6 })} />
        <Line d="M296 410L294 490M344 410L346 490" stroke={STROKE.fine} />
        <Motion kind="scan" amount={34}>
          <Dot x={268} y={446} r={6} color={BLUE} />
        </Motion>
        <Line
          d={curve([
            [268, 466],
            [300, 446],
            [330, 470],
            [372, 440],
          ])}
          stroke={STROKE.fine}
        />
      </g>
      <Shape
        d={blob({ cx: 262, cy: 446, rx: 11, seed: 7 })}
        color={CORAL}
        stroke={STROKE.regular}
      />
      <Shape
        d={blob({ cx: 332, cy: 444, rx: 11, seed: 8 })}
        color={CORAL}
        stroke={STROKE.regular}
      />
    </Illustration>
  );
}
