import { blob, box, polyline, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

// The lines being written. The pencil's moves in ill-scribe follow these:
// each starts at x 160 and the third is shorter.
const LINES = [
  { y: 104, width: 150, kind: "write-1" },
  { y: 136, width: 150, kind: "write-2" },
  { y: 168, width: 80, kind: "write-3" },
] as const;

/**
 * For waits while something is being made (a quiz, a story): a tiny character
 * hugging a giant pencil writes a card line by line, like a typewriter, and
 * starts a fresh one when it's done. A small viewBox keeps the lines chunky at
 * spinner sizes.
 */
export function PreparingScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title} viewBox="60 0 370 260">
      <Dot x={96} y={70} r={6} color={CORAL} />
      <Dot x={388} y={234} r={7} color={PURPLE} ring />

      <Shape d={box(130, 60, 230, 150, { seed: 3, bow: 4 })} color={YELLOW} />
      <Hatch d={blob({ cx: 330, cy: 192, rx: 18, ry: 10, seed: 2 })} />
      {LINES.map(({ y, width, kind }) => (
        <Motion key={y} kind={kind}>
          <Line d={wave(160, y, width, { amp: 3, period: 16, seed: y })} stroke={5} drawable />
        </Motion>
      ))}
      <Motion kind="done-flash">
        <Spark x={362} y={56} r={22} rotate={12} />
      </Motion>

      <Motion kind="scribe">
        <Scribe />
      </Motion>
    </Illustration>
  );
}

/** The writer and its pencil, with the pencil tip at (160, 104). */
function Scribe() {
  return (
    <g>
      <Line d="M206 92L204 108M216 90L220 105" stroke={STROKE.regular} />
      <Shape d={blob({ cx: 208, cy: 70, rx: 24, ry: 23, seed: 4 })} color={BLUE} />
      <Motion kind="blink" phase={0.8}>
        <Eye x={200} y={68} r={4} />
        <Eye x={213} y={66} r={4} />
      </Motion>
      <Line d="M202 80Q207 84 213 79" stroke={STROKE.fine} />

      <Shape
        d={polyline(
          [
            [160, 104],
            [175.1, 91.9],
            [162.9, 84.9],
          ],
          true,
        )}
        stroke={STROKE.regular}
      />
      <Shape
        d={polyline(
          [
            [175.1, 91.9],
            [204.1, 41.7],
            [191.9, 34.7],
            [162.9, 84.9],
          ],
          true,
        )}
        color={PURPLE}
        stroke={STROKE.regular}
        offset={[3, 2]}
      />
      <Shape
        d={polyline(
          [
            [204.1, 41.7],
            [210.1, 31.3],
            [197.9, 24.3],
            [191.9, 34.7],
          ],
          true,
        )}
        color={CORAL}
        stroke={STROKE.regular}
        offset={[3, 2]}
      />
      <Line d="M188 66Q180 74 176 70M190 84Q182 90 176 86" stroke={STROKE.regular} />
    </g>
  );
}
