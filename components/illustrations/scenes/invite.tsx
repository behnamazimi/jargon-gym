import { Clip } from "../clip";
import { blob, box, polyline, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, Fleck, ScribbleLines, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, INK, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

const CONFETTI = [
  { x: 262, y: 230, angle: 40, color: CORAL },
  { x: 545, y: 128, angle: -25, color: BLUE },
  { x: 196, y: 300, angle: 70, color: PURPLE },
  { x: 590, y: 290, angle: -60, color: YELLOW },
  { x: 300, y: 70, angle: 15, color: BLUE },
  { x: 500, y: 52, angle: -40, color: CORAL },
];

// How far below its resting spot the character hides inside the envelope.
const HIDDEN_DEPTH = 360;

/** Someone sneaking a look out of an envelope, then climbing out with a term card held high. */
export function InviteScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Motion kind="burst">
        <Motion kind="twinkle">
          <Spark x={210} y={150} r={22} rotate={8} />
        </Motion>
        <Motion kind="twinkle" phase={1.2}>
          <Spark x={600} y={200} r={18} rotate={-12} />
        </Motion>
        {CONFETTI.map((fleck, i) => (
          <Motion key={fleck.x} kind="flutter" phase={i * 0.5}>
            <Fleck {...fleck} />
          </Motion>
        ))}
      </Motion>
      <Dot x={250} y={110} r={7} color={YELLOW} />
      <Dot x={560} y={250} r={8} color={PURPLE} ring />
      <Dot x={620} y={110} r={6} color={CORAL} />

      <Line d={wave(200, 540, 400, { amp: 2, period: 44, seed: 5 })} stroke={STROKE.regular} />
      <Shape d={box(240, 335, 320, 190, { seed: 2 })} />
      <Shape
        d={polyline(
          [
            [240, 335],
            [400, 222],
            [560, 335],
          ],
          true,
        )}
        color={PURPLE}
      />

      {/* Sneaks a peek over the rim and looks around, then pops out with the card
          held overhead, shows it off, and ducks back in. While it's down, the
          envelope's front hides it and the clip keeps it from poking out below.
          The card and arms stay down during the peek and come up with the pop. */}
      <Clip d="M0 0H800V522H0Z">
        <Motion kind="emerge-card" amount={HIDDEN_DEPTH}>
          <Line d="M352 310Q326 256 338 200M448 310Q474 256 462 198" />
        </Motion>
        <Motion kind="emerge" amount={HIDDEN_DEPTH}>
          <Motion kind="emerge-squash" origin="50% 100%">
            <Shape
              d={blob({ cx: 400, cy: 332, rx: 64, ry: 80, taper: 0.1, seed: 6 })}
              color={CORAL}
            />
            <Motion kind="peek-face">
              <Eye x={386} y={290} r={7} />
              <Eye x={414} y={288} r={7} />
            </Motion>
            <Motion kind="happy-face">
              <Line d="M376 292Q384 280 392 292M408 290Q416 278 424 290" stroke={STROKE.regular} />
              <path d="M382 306Q401 338 420 305Z" style={{ fill: INK }} />
            </Motion>
          </Motion>
        </Motion>
        <Motion kind="emerge-card" amount={HIDDEN_DEPTH}>
          <Motion kind="emerge-waggle">
            <g transform="rotate(-6 400 160)">
              <Shape d={box(318, 108, 164, 98, { seed: 3, bow: 4 })} color={YELLOW} />
              <Line d={wave(338, 136, 90, { amp: 3, period: 26, seed: 8 })} stroke={8} />
              <ScribbleLines x={338} y={160} width={120} lines={2} gap={20} seed={4} />
            </g>
          </Motion>
          <Shape
            d={blob({ cx: 338, cy: 202, rx: 11, seed: 7 })}
            color={CORAL}
            stroke={STROKE.regular}
          />
          <Shape
            d={blob({ cx: 462, cy: 196, rx: 11, seed: 8 })}
            color={CORAL}
            stroke={STROKE.regular}
          />
        </Motion>
      </Clip>

      <Shape
        d={polyline(
          [
            [240, 335],
            [400, 440],
            [560, 335],
            [560, 525],
            [240, 525],
          ],
          true,
        )}
        color={BLUE}
      />
      <Line d="M244 521L372 432M556 521L428 432" stroke={STROKE.regular} />
      <Hatch d={blob({ cx: 300, cy: 495, rx: 30, ry: 14, seed: 9 })} />
    </Illustration>
  );
}
