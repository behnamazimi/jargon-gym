import { blob, box, polyline, quad, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, Spark, Squiggle } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

// The box is split around the falling card (back rim behind it, front before
// it), so both halves turn about the same points.
const LEAN_PIVOT: readonly [number, number] = [172, 248];
const SHAKE_PIVOT: readonly [number, number] = [268, 256];

/**
 * For empty collections and term lists: someone peeks into an empty card box,
 * gives it a shake, then watches a blank card drift down into it, as a hint to
 * add the first one.
 */
export function EmptyBoxScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title} viewBox="40 20 340 270">
      <Squiggle x={300} y={62} width={50} rotate={10} seed={3} />
      <Dot x={74} y={96} r={6} color={PURPLE} />
      <Dot x={350} y={236} r={7} color={YELLOW} ring />
      <Line d={wave(84, 272, 256, { amp: 2, period: 36, seed: 4 })} stroke={STROKE.regular} />
      <Line d="M160 244L156 270M184 244L190 270" />
      <Line d="M146 271L158 271M188 271L200 271" stroke={9} />

      <Motion kind="peek-lean" pivot={LEAN_PIVOT}>
        <Line d="M198 210L228 234" />
        <Shape d={blob({ cx: 172, cy: 190, rx: 38, ry: 58, taper: 0.12, seed: 9 })} color={BLUE} />
        <Hatch d={blob({ cx: 156, cy: 226, rx: 12, ry: 9, seed: 2 })} />
        <Motion kind="blink" phase={2.2}>
          <Motion kind="look-up">
            <Eye x={186} y={168} />
            <Eye x={202} y={166} />
          </Motion>
        </Motion>
        <Dot x={194} y={192} r={3} ring />

        <Motion kind="box-shake" pivot={SHAKE_PIVOT}>
          <Shape
            d={quad(
              [
                [222, 197],
                [316, 191],
                [316, 205],
                [222, 209],
              ],
              { seed: 4, bow: 1 },
            )}
            stroke={STROKE.regular}
          />
          <Hatch d={box(228, 197, 82, 8)} />
        </Motion>
      </Motion>

      {/* A blank card drifts down and drops into the box. */}
      <Motion kind="drift-in">
        <Shape d={box(250, 176, 44, 30, { seed: 6, bow: 1 })} stroke={STROKE.regular} />
      </Motion>

      <Motion kind="peek-lean" pivot={LEAN_PIVOT}>
        <Motion kind="box-shake" pivot={SHAKE_PIVOT}>
          <Shape
            d={polyline(
              [
                [222, 198],
                [200, 178],
                [214, 170],
                [240, 194],
              ],
              true,
            )}
            color={YELLOW}
            stroke={STROKE.regular}
          />
          <Shape
            d={polyline(
              [
                [316, 192],
                [338, 172],
                [350, 182],
                [318, 202],
              ],
              true,
            )}
            color={YELLOW}
            stroke={STROKE.regular}
          />
          <Shape
            d={quad(
              [
                [220, 206],
                [318, 200],
                [312, 254],
                [226, 258],
              ],
              { seed: 5, bow: 2 },
            )}
            color={CORAL}
          />
        </Motion>
        <Line d="M204 198L232 218" />
        <Dot x={234} y={219} r={7} color={BLUE} />
      </Motion>
      <Motion kind="twinkle" phase={0.4}>
        <Spark x={318} y={124} r={16} />
      </Motion>
    </Illustration>
  );
}
