import { blob, box, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dashes, Dot, Eye, ScribbleLines, Squiggle } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

/**
 * For errors: a house of cards wobbles and its top floor collapses while the
 * builder flinches. Then it's built back up for another go, like "Try again".
 * The falling cards' landing spots are baked into ill-fall-top and ill-fall-next.
 */
function LeaningCard({
  x,
  y,
  tilt,
  color,
  seed,
}: {
  x: number;
  y: number;
  tilt: number;
  color?: string;
  seed: number;
}) {
  return (
    <g transform={`rotate(${tilt} ${x} ${y})`}>
      <Shape
        d={box(x - 26, y - 42, 52, 84, { seed, bow: 2 })}
        color={color}
        stroke={STROKE.regular}
      />
      <ScribbleLines x={x - 14} y={y - 20} width={28} lines={3} gap={12} seed={seed + 10} />
    </g>
  );
}

export function SomethingWentWrongScene({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <Illustration className={className} title={title}>
      <Squiggle x={640} y={170} width={70} rotate={12} seed={7} />
      <Dot x={130} y={220} r={8} color={PURPLE} ring />
      <Dot x={560} y={230} r={6} color={YELLOW} />
      <Line d={wave(110, 520, 640, { amp: 2, period: 44, seed: 4 })} stroke={STROKE.regular} />

      {/* A house of cards: two A-frames, a card across them, one A-frame on top. */}
      <Motion kind="topple" origin="50% 100%">
        <LeaningCard x={378} y={476} tilt={16} color={BLUE} seed={1} />
        <LeaningCard x={422} y={476} tilt={-16} seed={2} />
        <LeaningCard x={498} y={476} tilt={16} seed={3} />
        <LeaningCard x={542} y={476} tilt={-16} color={PURPLE} seed={4} />
        <Shape d={box(354, 424, 212, 14, { seed: 5, bow: 1 })} color={YELLOW} />
        <Motion kind="fall-next">
          <LeaningCard x={438} y={378} tilt={16} color={YELLOW} seed={6} />
        </Motion>
        <Motion kind="fall-top">
          <LeaningCard x={482} y={378} tilt={-16} color={CORAL} seed={7} />
        </Motion>
      </Motion>
      <Motion kind="fall-dashes">
        <Dashes x={556} y={330} angle={-50} count={3} length={16} />
      </Motion>

      {/* The builder: watches, flinches with hands up as it falls, recovers. */}
      <Line d="M204 498L198 522M232 498L240 522" />
      <Line d="M186 523L200 523M238 523L252 523" stroke={9} />
      <Motion kind="flinch-arm" pivot={[184, 440]} mirror>
        <Line d="M184 440Q166 460 160 482" />
      </Motion>
      <Motion kind="flinch-arm" pivot={[252, 440]}>
        <Line d="M252 440Q270 460 276 482" />
      </Motion>
      <Motion kind="flinch" origin="50% 100%">
        <Shape d={blob({ cx: 218, cy: 432, rx: 48, ry: 72, taper: 0.12, seed: 6 })} color={CORAL} />
        <Hatch d={blob({ cx: 200, cy: 476, rx: 14, ry: 10, seed: 3 })} />
        <Motion kind="flinch-eyes">
          <Eye x={232} y={402} />
          <Eye x={252} y={400} />
        </Motion>
        <Line d="M232 424Q242 418 254 424" stroke={STROKE.regular} />
      </Motion>
    </Illustration>
  );
}
