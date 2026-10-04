import { blob, box, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, ScribbleLines, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

/** The words working: a customer says it at a café counter, and the cup slides over. */
export function CollectionVocabularyScene({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <Illustration className={className} title={title}>
      <Motion kind="twinkle">
        <Spark x={700} y={190} r={18} />
      </Motion>
      <Dot x={150} y={170} r={7} color={PURPLE} ring />
      <Line d={wave(110, 524, 580, { amp: 2, period: 44, seed: 9 })} stroke={STROKE.regular} />

      {/* Behind the counter: understands, nods. */}
      <Motion kind="nod" origin="50% 100%">
        <Shape d={blob({ cx: 610, cy: 360, rx: 54, ry: 74, taper: 0.1, seed: 12 })} color={CORAL} />
        <Motion kind="blink" phase={1.7}>
          <Eye x={586} y={334} />
          <Eye x={608} y={336} />
        </Motion>
        <Line d="M588 356Q598 365 608 356" stroke={STROKE.regular} />
      </Motion>

      {/* The cup, slid across once the word is said. */}
      <Motion kind="slide-cup">
        <Motion kind="steam">
          <Line d="M650 340Q644 332 650 324Q656 316 650 308" stroke={STROKE.fine} />
        </Motion>
        <Shape d={box(630, 350, 40, 48, { seed: 13 })} color={PURPLE} />
        <Line d="M670 360C684 360 684 382 670 382" stroke={STROKE.regular} />
      </Motion>

      {/* The counter. */}
      <Line d="M376 398L724 398" stroke={STROKE.bold} />
      <Shape d={box(390, 400, 320, 124, { seed: 14 })} color={YELLOW} />
      <Hatch d={blob({ cx: 650, cy: 480, rx: 30, ry: 14, seed: 15 })} />

      {/* The customer, saying the word. */}
      <Line d="M252 500L246 524M292 500L298 524" />
      <Shape d={blob({ cx: 272, cy: 420, rx: 60, ry: 84, taper: 0.1, seed: 10 })} color={BLUE} />
      <Motion kind="blink" phase={1}>
        <Eye x={284} y={384} />
        <Eye x={306} y={382} />
      </Motion>
      <Shape d={blob({ cx: 300, cy: 410, rx: 8, ry: 6, seed: 16 })} stroke={STROKE.regular} />
      <Line d="M326 440Q352 420 372 404" />
      <Motion kind="say" origin="20% 100%">
        <Shape d={box(250, 200, 180, 84, { seed: 17, bow: 6 })} />
        <Line d="M290 282L284 322L322 282" stroke={STROKE.regular} />
        <Line d={wave(274, 230, 110, { amp: 3, period: 26, seed: 18 })} stroke={8} />
        <ScribbleLines x={274} y={256} width={130} lines={1} gap={14} seed={19} />
      </Motion>
    </Illustration>
  );
}
