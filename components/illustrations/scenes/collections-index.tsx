import { blob, box, curve, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, ScribbleLines, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

const TOP_SHELF = 340;
const BOTTOM_SHELF = 470;

// The reaching arm turns about this shoulder, and the box rides along with it.
const SHOULDER = [340, 395] as const;
// The box being fetched, where it sits on the shelf.
const FETCHED = { x: 404, y: TOP_SHELF - 64, w: 60, h: 64 };

const BOXES = [
  { x: 470, y: TOP_SHELF, w: 70, color: BLUE },
  { x: 548, y: TOP_SHELF, w: 90, color: YELLOW },
  { x: 646, y: TOP_SHELF, w: 60, color: PURPLE },
  { x: 410, y: BOTTOM_SHELF, w: 84, color: YELLOW },
  { x: 502, y: BOTTOM_SHELF, w: 64, color: CORAL },
  { x: 574, y: BOTTOM_SHELF, w: 96, color: BLUE },
];

function CardBox({
  x,
  y,
  w,
  h,
  seed,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  seed: number;
}) {
  return (
    <>
      <Shape d={box(x, y, w, h, { seed })} color={CORAL} />
      <Shape d={box(x + 10, y + 18, w - 20, 16, { seed: seed + 1 })} stroke={STROKE.fine} />
      <ScribbleLines x={x + 12} y={y + 46} width={w - 24} lines={1} gap={14} seed={seed + 2} />
    </>
  );
}

/** Picking a collection: takes a box off the shelf, turns round and holds it out to you. */
export function CollectionsIndexScene({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <Illustration className={className} title={title}>
      <Motion kind="twinkle">
        <Spark x={170} y={170} r={20} />
      </Motion>
      <Dot x={720} y={220} r={7} color={CORAL} ring />
      <Line d={wave(100, 524, 620, { amp: 2, period: 44, seed: 3 })} stroke={STROKE.regular} />

      {/* The shelf. */}
      <Line
        d={`M396 ${TOP_SHELF}L720 ${TOP_SHELF}M396 ${BOTTOM_SHELF}L720 ${BOTTOM_SHELF}`}
        stroke={STROKE.bold}
      />
      <Line d="M400 250L400 524M716 250L716 524" />
      {BOXES.map((item, i) => (
        <g key={`${item.x}-${item.y}`}>
          <Shape d={box(item.x, item.y - 64, item.w, 64, { seed: i + 2 })} color={item.color} />
          <Shape
            d={box(item.x + 12, item.y - 46, item.w - 24, 16, { seed: i + 9 })}
            stroke={STROKE.fine}
          />
        </g>
      ))}

      {/* The picker. */}
      <Line d="M280 500L274 524M320 500L326 524" />
      <Motion kind="fetch-turn" origin="50% 100%">
        <Shape d={blob({ cx: 300, cy: 420, rx: 58, ry: 82, taper: 0.1, seed: 6 })} color={PURPLE} />
        <Hatch d={blob({ cx: 276, cy: 470, rx: 16, ry: 10, seed: 7 })} />
      </Motion>
      <Motion kind="fetch-face">
        <Motion kind="blink" phase={1.5}>
          <Eye x={312} y={378} />
          <Eye x={334} y={376} />
        </Motion>
        <Line d="M314 398Q324 406 334 398" stroke={STROKE.regular} />
      </Motion>

      {/* Arms go behind whatever box they hold. */}
      <Motion kind="fetch-solo">
        <Line d="M248 430Q232 456 238 480" />
      </Motion>
      <Motion kind="fetch-arm" pivot={SHOULDER}>
        <Line
          d={curve([
            [SHOULDER[0], SHOULDER[1]],
            [378, 356],
            [406, 310],
          ])}
        />
        <Shape
          d={blob({ cx: 408, cy: 310, rx: 11, seed: 8 })}
          color={PURPLE}
          stroke={STROKE.regular}
        />
      </Motion>
      <Motion kind="fetch-offer">
        <Line d="M248 412Q230 438 266 448M352 412Q370 438 334 448" />
        <Shape
          d={blob({ cx: 266, cy: 448, rx: 11, seed: 9 })}
          color={PURPLE}
          stroke={STROKE.regular}
        />
        <Shape
          d={blob({ cx: 334, cy: 448, rx: 11, seed: 10 })}
          color={PURPLE}
          stroke={STROKE.regular}
        />
      </Motion>

      {/* The fetched box: on the shelf, then carried down level in the hand. */}
      <Motion kind="fetch-box" pivot={SHOULDER}>
        <Motion kind="fetch-level" pivot={[FETCHED.x + FETCHED.w / 2, FETCHED.y + FETCHED.h / 2]}>
          <CardBox {...FETCHED} seed={20} />
        </Motion>
      </Motion>
      {/* The same box swung to the front in both hands and held out to you. */}
      <Motion kind="fetch-handoff">
        <CardBox x={270} y={413} w={60} h={64} seed={20} />
      </Motion>
    </Illustration>
  );
}
