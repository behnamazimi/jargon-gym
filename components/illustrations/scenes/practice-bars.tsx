import { blob, box, curve, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, DottedPath, Eye, ScribbleLines, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

// The shoulder the card arm swings from.
const SHOULDER = [266, 410] as const;
const GROUND = 524;

const BARS = [
  { x: 440, height: 120, color: YELLOW, seed: 2 },
  { x: 540, height: 180, color: CORAL, seed: 3 },
  { x: 640, height: 240, color: PURPLE, seed: 4 },
];

/** Progress that fades if you stop: the bars climb while they practise and sink back a little while they rest. */
export function PracticeBarsScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Motion kind="twinkle">
        <Spark x={140} y={180} r={18} rotate={4} />
      </Motion>
      <Dot x={380} y={140} r={7} color={BLUE} ring />
      <Dot x={250} y={240} r={6} color={YELLOW} />
      <Dot x={740} y={200} r={6} color={CORAL} />

      <Line
        d={wave(100, GROUND + 2, 620, { amp: 2, period: 44, seed: 5 })}
        stroke={STROKE.regular}
      />

      {BARS.map((bar, i) => (
        <g key={bar.x}>
          {/* Where it reached at its best, so the dip shows. */}
          <DottedPath
            d={`M${bar.x - 8} ${GROUND - bar.height}L${bar.x + 72} ${GROUND - bar.height}`}
          />
          <Motion kind="practice-grow" origin="50% 100%" phase={i * 0.25}>
            <Shape
              d={box(bar.x, GROUND - bar.height, 64, bar.height, { seed: bar.seed })}
              color={bar.color}
            />
            <Hatch
              d={blob({ cx: bar.x + 40, cy: GROUND - 26, rx: 14, ry: 10, seed: bar.seed + 10 })}
            />
          </Motion>
        </g>
      ))}

      <Practiser />
    </Illustration>
  );
}

function Practiser() {
  return (
    <g>
      <Line d="M198 506L192 526M238 506L244 526" />
      <Line d="M168 444Q150 474 162 498" />
      <Motion kind="practice-rest" origin="50% 100%">
        <Shape d={blob({ cx: 218, cy: 440, rx: 58, ry: 82, taper: 0.1, seed: 6 })} color={BLUE} />
        <Hatch d={blob({ cx: 194, cy: 480, rx: 18, ry: 12, seed: 7 })} />
        <Motion kind="blink" phase={3.2}>
          <Motion kind="practice-eyes">
            <Eye x={234} y={402} />
            <Eye x={256} y={400} />
          </Motion>
        </Motion>
        <Line d="M236 424Q246 430 257 423" stroke={STROKE.regular} />
      </Motion>

      {/* Holds a card up and turns it over, then lowers it and takes a break. */}
      <Motion kind="practice-arm" pivot={SHOULDER}>
        <Line
          d={curve([
            [SHOULDER[0], SHOULDER[1]],
            [298, 370],
            [314, 330],
          ])}
        />
        <Motion kind="practice-flip-front">
          <Shape d={box(282, 270, 76, 52, { seed: 8, bow: 2 })} stroke={STROKE.regular} />
          <ScribbleLines x={294} y={286} width={52} lines={2} gap={14} seed={9} />
        </Motion>
        <Motion kind="practice-flip-back">
          <Shape
            d={box(282, 270, 76, 52, { seed: 8, bow: 2 })}
            color={YELLOW}
            stroke={STROKE.regular}
          />
          <ScribbleLines x={294} y={286} width={52} lines={2} gap={14} seed={10} />
        </Motion>
        <Shape
          d={blob({ cx: 316, cy: 326, rx: 9, seed: 11 })}
          color={BLUE}
          stroke={STROKE.regular}
        />
      </Motion>
    </g>
  );
}
