import { blob, box, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, Fleck } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, INK, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

const CONFETTI = [
  { x: 110, y: 120, angle: 30, color: CORAL },
  { x: 290, y: 70, angle: -30, color: PURPLE },
  { x: 300, y: 170, angle: 60, color: YELLOW },
  { x: 96, y: 200, angle: -50, color: BLUE },
  { x: 130, y: 52, angle: 10, color: YELLOW },
];

/** For a strong quiz round: hopping with a check-marked card held high. */
export function QuizCheerScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title} viewBox="60 20 280 270">
      {CONFETTI.map((fleck, i) => (
        <Motion key={fleck.x} kind="flutter" phase={i * 0.5}>
          <Fleck {...fleck} />
        </Motion>
      ))}
      <Line d={wave(110, 274, 180, { amp: 2, period: 36, seed: 2 })} stroke={STROKE.regular} />

      <Motion kind="celebrate-hop">
        <Line d="M188 250L184 268M212 250L216 268" />
        <Line d="M174 269L186 269M214 269L226 269" stroke={9} />
        <Line d="M174 194Q158 152 170 112M226 194Q242 152 232 110" />
        <Motion kind="celebrate-squash" origin="50% 100%">
          <Shape
            d={blob({ cx: 200, cy: 200, rx: 40, ry: 56, taper: 0.1, seed: 6 })}
            color={CORAL}
          />
          <Line d="M180 182Q186 174 192 182M204 180Q210 172 216 180" stroke={STROKE.regular} />
          <path d="M188 196Q199 216 212 195Z" style={{ fill: INK }} />
        </Motion>
        <g transform="rotate(-4 200 88)">
          <Shape d={box(150, 62, 100, 52, { seed: 3, bow: 3 })} color={BLUE} />
          <Line d="M180 88L194 102L222 72" stroke={8} />
        </g>
        <Dot x={170} y={112} r={8} color={CORAL} />
        <Dot x={232} y={110} r={8} color={CORAL} />
      </Motion>
    </Illustration>
  );
}

/**
 * For a practice round or a round that needs more work: pressing a barbell
 * whose plates are cards. Training, not failing.
 */
export function KeepTrainingScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title} viewBox="60 40 280 250">
      <Line d={wave(100, 274, 200, { amp: 2, period: 36, seed: 3 })} stroke={STROKE.regular} />
      <Line d="M184 254L170 272M216 254L230 272" />
      <Line d="M158 273L172 273M228 273L242 273" stroke={9} />

      {/* Presses the bar up, holds, lowers it; the arms stretch from the shoulders. */}
      <Motion kind="lift-arms" origin="50% 100%">
        <Line d="M176 188L164 112" />
      </Motion>
      <Motion kind="lift-arms" origin="50% 100%">
        <Line d="M224 188L236 112" />
      </Motion>
      <Motion kind="lift-squash" origin="50% 100%">
        <Shape d={blob({ cx: 200, cy: 206, rx: 44, ry: 54, taper: 0.1, seed: 8 })} color={YELLOW} />
        <Hatch d={blob({ cx: 220, cy: 236, rx: 13, ry: 9, seed: 2 })} cross />
        <Line d="M180 176L196 182M206 180L222 174" stroke={STROKE.regular} />
        <Eye x={190} y={192} />
        <Eye x={212} y={190} />
        <Line d="M192 212L212 210" stroke={STROKE.regular} />
      </Motion>
      <Motion kind="drip">
        <Shape
          d="M242 164Q250 175 242 180Q234 175 242 164Z"
          color={BLUE}
          stroke={STROKE.fine}
          offset={[2, 2]}
        />
      </Motion>
      <Motion kind="drip" phase={0.8}>
        <Shape
          d="M156 172Q164 183 156 188Q148 183 156 172Z"
          color={BLUE}
          stroke={STROKE.fine}
          offset={[2, 2]}
        />
      </Motion>

      <Motion kind="lift-bar">
        <Line d="M96 112L304 112" stroke={7} />
        <Shape
          d={box(104, 82, 22, 60, { seed: 4, bow: 1 })}
          color={PURPLE}
          stroke={STROKE.regular}
        />
        <Shape d={box(126, 90, 16, 44, { seed: 5, bow: 1 })} color={BLUE} stroke={STROKE.regular} />
        <Shape
          d={box(274, 82, 22, 60, { seed: 6, bow: 1 })}
          color={PURPLE}
          stroke={STROKE.regular}
        />
        <Shape d={box(258, 90, 16, 44, { seed: 7, bow: 1 })} color={BLUE} stroke={STROKE.regular} />
        <Dot x={164} y={112} r={8} color={YELLOW} />
        <Dot x={236} y={112} r={8} color={YELLOW} />
      </Motion>
    </Illustration>
  );
}
