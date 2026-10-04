import { blob, box, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, ScribbleLines, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, INK, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

const TOP_SHELF = 300;
const BOTTOM_SHELF = 440;

const BOXES = [
  { x: 470, y: TOP_SHELF, w: 70, color: BLUE },
  { x: 548, y: TOP_SHELF, w: 90, color: YELLOW },
  { x: 646, y: TOP_SHELF, w: 60, color: PURPLE },
  { x: 410, y: BOTTOM_SHELF, w: 84, color: YELLOW },
  { x: 502, y: BOTTOM_SHELF, w: 64, color: CORAL },
  { x: 574, y: BOTTOM_SHELF, w: 96, color: BLUE },
];

/** Picking a collection: up on tiptoe for a box off the shelf, then turning round to hold it
 *  out to you. */
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
      <Dot x={720} y={200} r={7} color={CORAL} ring />
      <Line d={wave(100, 524, 620, { amp: 2, period: 44, seed: 3 })} stroke={STROKE.regular} />

      {/* The shelf. */}
      <Line
        d={`M396 ${TOP_SHELF}L720 ${TOP_SHELF}M396 ${BOTTOM_SHELF}L720 ${BOTTOM_SHELF}`}
        stroke={STROKE.bold}
      />
      <Line d="M400 220L400 524M716 220L716 524" />
      {BOXES.map((item, i) => (
        <g key={`${item.x}-${item.y}`}>
          <Shape d={box(item.x, item.y - 64, item.w, 64, { seed: i + 2 })} color={item.color} />
          <Shape
            d={box(item.x + 12, item.y - 46, item.w - 24, 16, { seed: i + 9 })}
            stroke={STROKE.fine}
          />
        </g>
      ))}

      <Motion kind="fetch-tiptoe" origin="50% 100%">
        <Line d="M280 500L274 524M320 500L326 524" />
        <Shape d={blob({ cx: 300, cy: 420, rx: 58, ry: 82, taper: 0.1, seed: 6 })} color={PURPLE} />
        <Hatch d={blob({ cx: 276, cy: 470, rx: 16, ry: 10, seed: 7 })} />

        {/* Looking up at the shelf. */}
        <Motion kind="fetch-reach">
          <Eye x={312} y={378} />
          <Eye x={334} y={376} />
          <Line d="M314 400Q324 408 334 400" stroke={STROKE.regular} />
        </Motion>
        {/* Turned round to you. */}
        <Motion kind="fetch-offer">
          <Eye x={288} y={368} />
          <Eye x={312} y={368} />
          <path d="M288 382Q300 396 312 382Z" style={{ fill: INK }} />
        </Motion>
      </Motion>

      {/* The box: off the shelf, then held out in front. */}
      <Motion kind="fetch-box">
        <Shape d={box(404, TOP_SHELF - 64, 60, 64, { seed: 20 })} color={CORAL} />
        <Shape d={box(414, TOP_SHELF - 46, 40, 16, { seed: 21 })} stroke={STROKE.fine} />
        <ScribbleLines x={416} y={TOP_SHELF - 18} width={36} lines={1} gap={14} seed={22} />
      </Motion>

      <Motion kind="fetch-tiptoe" origin="50% 100%">
        {/* One arm resting, the other reaching for the box. */}
        <Motion kind="fetch-reach">
          <Line d="M248 430Q232 456 238 480" />
          <Line d="M344 404Q380 340 396 276" />
          <Shape
            d={blob({ cx: 398, cy: 270, rx: 11, seed: 8 })}
            color={PURPLE}
            stroke={STROKE.regular}
          />
        </Motion>
      </Motion>
      {/* Both arms holding the box out. */}
      <Motion kind="fetch-offer">
        <Line d="M246 412Q236 432 254 444M354 412Q364 432 346 444" />
        <Shape
          d={blob({ cx: 256, cy: 446, rx: 11, seed: 9 })}
          color={PURPLE}
          stroke={STROKE.regular}
        />
        <Shape
          d={blob({ cx: 344, cy: 446, rx: 11, seed: 10 })}
          color={PURPLE}
          stroke={STROKE.regular}
        />
      </Motion>
    </Illustration>
  );
}
