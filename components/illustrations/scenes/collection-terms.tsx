import { blob, box, curve, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, ScribbleLines, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

/** Lost, then following: a colleague's term passes over, the listener's question mark turns
 *  into a spark, and they nod along. */
export function CollectionTermsScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Dot x={140} y={170} r={7} color={YELLOW} />
      <Dot x={700} y={150} r={6} color={PURPLE} ring />
      <Line d={wave(110, 524, 580, { amp: 2, period: 44, seed: 2 })} stroke={STROKE.regular} />

      {/* The colleague, mid-sentence. */}
      <Line d="M206 500L200 524M246 500L252 524" />
      <Shape d={blob({ cx: 226, cy: 420, rx: 60, ry: 84, taper: 0.1, seed: 3 })} color={BLUE} />
      <Hatch d={blob({ cx: 202, cy: 460, rx: 18, ry: 12, seed: 4 })} />
      <Motion kind="blink" phase={0.6}>
        <Eye x={236} y={384} />
        <Eye x={258} y={382} />
      </Motion>
      <Shape d={blob({ cx: 250, cy: 410, rx: 9, ry: 7, seed: 5 })} stroke={STROKE.regular} />
      <Line d="M282 428Q304 410 312 384" />

      {/* The speech bubble, with the term in it. */}
      <Shape d={box(250, 150, 196, 116, { seed: 6, bow: 6 })} />
      <Line d="M290 264L270 318L326 264" stroke={STROKE.regular} />
      <Motion kind="pass-card">
        <Shape d={box(282, 180, 128, 60, { seed: 7 })} color={YELLOW} />
        <Line d={wave(296, 198, 70, { amp: 3, period: 24, seed: 8 })} stroke={7} />
        <ScribbleLines x={296} y={222} width={96} lines={1} gap={14} seed={9} />
      </Motion>

      {/* The listener: puzzled, then it clicks. */}
      <Motion kind="puzzle-mark" origin="50% 100%">
        <Line d="M610 252Q610 230 628 230Q646 230 644 248Q642 262 628 266L628 280" />
        <Dot x={628} y={298} r={5} color={YELLOW} />
      </Motion>
      <Motion kind="click-spark">
        <Spark x={628} y={262} r={26} rays={7} />
      </Motion>
      <Motion kind="nod" origin="50% 100%">
        <Line d="M560 506L554 524M602 506L608 524" />
        <Shape d={blob({ cx: 580, cy: 430, rx: 58, ry: 82, taper: 0.1, seed: 10 })} color={CORAL} />
        <Motion kind="blink" phase={2.1}>
          <Eye x={556} y={394} />
          <Eye x={578} y={396} />
        </Motion>
        <Line d="M556 418Q567 427 578 418" stroke={STROKE.regular} />
        <Line
          d={curve([
            [536, 430],
            [520, 380],
            [536, 334],
          ])}
        />
        <Shape
          d={blob({ cx: 538, cy: 326, rx: 11, seed: 11 })}
          color={CORAL}
          stroke={STROKE.regular}
        />
      </Motion>
    </Illustration>
  );
}
