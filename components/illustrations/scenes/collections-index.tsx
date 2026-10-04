import { blob, box, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, ScribbleLines, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
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

/** Choosing from a shelf of labelled card boxes: up on tiptoe, one pulled out to look. */
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
        <Spark x={310} y={150} r={20} />
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

      {/* The box being pulled out to look inside. */}
      <Motion kind="pull-box">
        <Shape d={box(404, TOP_SHELF - 64, 60, 64, { seed: 20 })} color={CORAL} />
        <ScribbleLines x={414} y={TOP_SHELF - 40} width={40} lines={1} gap={14} seed={21} />
      </Motion>

      {/* The chooser, up on tiptoe. */}
      <Motion kind="reach" origin="50% 100%">
        <Line d="M268 500L262 524M308 500L314 524" />
        <Shape d={blob({ cx: 288, cy: 420, rx: 58, ry: 82, taper: 0.1, seed: 6 })} color={PURPLE} />
        <Hatch d={blob({ cx: 266, cy: 458, rx: 16, ry: 10, seed: 7 })} />
        <Motion kind="blink" phase={1.5}>
          <Eye x={300} y={380} />
          <Eye x={322} y={378} />
        </Motion>
        <Line d="M302 404Q312 412 322 404" stroke={STROKE.regular} />
        <Line d="M332 400Q370 340 384 272" />
        <Shape
          d={blob({ cx: 386, cy: 266, rx: 11, seed: 8 })}
          color={PURPLE}
          stroke={STROKE.regular}
        />
      </Motion>
    </Illustration>
  );
}
