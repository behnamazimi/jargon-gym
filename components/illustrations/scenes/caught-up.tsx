import { blob, box, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Line, Shape, STROKE } from "../shape";

/**
 * For "all caught up": someone sits back on a neat stack of finished cards,
 * legs swinging, eyes closed, thinking about a job well done.
 */
export function CaughtUpScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title} viewBox="70 20 330 250">
      <Dot x={104} y={70} r={6} color={CORAL} />
      <Line d={wave(100, 252, 260, { amp: 2, period: 36, seed: 5 })} stroke={STROKE.regular} />

      <Shape d={box(150, 224, 170, 24, { seed: 1, bow: 2 })} color={BLUE} />
      <Shape d={box(160, 202, 152, 22, { seed: 2, bow: 2 })} />
      <Shape d={box(154, 180, 164, 22, { seed: 3, bow: 2 })} color={YELLOW} />

      {/* Sits back on the finished pile: legs swinging over the edge, leaning
          on its hands, slow contented breaths. */}
      <Motion kind="wiggle" pivot={[226, 172]} amount={14} duration={0.9}>
        <Line d="M226 172L220 206M220 207L210 207" />
      </Motion>
      <Motion kind="wiggle" pivot={[248, 172]} amount={14} duration={0.9} phase={0.9}>
        <Line d="M248 172L254 206M254 207L266 207" />
      </Motion>
      <Motion kind="bob" amount={2} duration={2.4}>
        <Line d="M208 146L188 178M264 142L286 176" />
        <Dot x={186} y={180} r={7} color={PURPLE} />
        <Dot x={288} y={178} r={7} color={PURPLE} />
        <Shape
          d={blob({ cx: 236, cy: 130, rx: 36, ry: 50, taper: 0.1, rotate: -8, seed: 4 })}
          color={PURPLE}
        />
        <Line
          d="M222 116Q228 109 234 116M242 113Q248 106 254 113M226 132Q238 142 252 128"
          stroke={STROKE.regular}
        />
      </Motion>

      <Motion kind="bob" amount={4} duration={1.8}>
        <Dot x={290} y={112} r={4} ring />
        <Dot x={306} y={94} r={6} ring />
        <Shape d={blob({ cx: 346, cy: 62, rx: 32, ry: 24, seed: 7 })} stroke={STROKE.regular} />
        <Line d="M332 62L342 72L360 50" stroke={7} />
      </Motion>
      <Motion kind="twinkle" phase={0.6}>
        <Spark x={128} y={128} r={16} />
      </Motion>
    </Illustration>
  );
}
