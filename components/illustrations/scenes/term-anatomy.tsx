import { blob, box, curve, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, DottedPath, Eye, ScribbleLines, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

// The stack fans out from this point, like a hand of cards.
const FAN = [500, 470] as const;

/** A term is more than a definition: layered cards fanned out, read closely through a magnifier. */
export function TermAnatomyScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Motion kind="twinkle">
        <Spark x={170} y={170} r={18} rotate={6} />
      </Motion>
      <Motion kind="twinkle" phase={1.4}>
        <Spark x={700} y={330} r={16} rotate={-10} />
      </Motion>
      <Dot x={300} y={140} r={7} color={PURPLE} ring />
      <Dot x={620} y={110} r={6} color={YELLOW} />

      <Line d={wave(130, 524, 560, { amp: 2, period: 44, seed: 7 })} stroke={STROKE.regular} />

      {/* Mental model and example peek out behind the definition. */}
      <g transform={`rotate(14 ${FAN[0]} ${FAN[1]})`}>
        <Shape d={box(390, 250, 220, 150, { seed: 2 })} color={PURPLE} />
        <Dot x={588} y={274} r={9} color={YELLOW} ring />
      </g>
      <g transform={`rotate(6 ${FAN[0]} ${FAN[1]})`}>
        <Shape d={box(390, 250, 220, 150, { seed: 3 })} color={BLUE} />
        <ScribbleLines x={560} y={280} width={34} lines={3} gap={14} seed={5} />
      </g>
      <g transform={`rotate(-4 ${FAN[0]} ${FAN[1]})`}>
        <Shape d={box(390, 250, 220, 150, { seed: 4 })} color={YELLOW} />
        <Line d={wave(412, 282, 120, { amp: 3, period: 28, seed: 9 })} stroke={8} />
        <ScribbleLines x={412} y={312} width={170} lines={3} gap={20} seed={6} />
      </g>

      {/* A related term, linked to the stack. */}
      <DottedPath
        d={curve([
          [606, 248],
          [640, 214],
          [664, 196],
        ])}
        moving
      />
      <g transform="rotate(8 690 170)">
        <Shape d={box(648, 142, 88, 58, { seed: 8 })} color={CORAL} />
        <ScribbleLines x={662} y={164} width={58} lines={2} gap={14} seed={7} />
      </g>

      {/* The reader. */}
      <Line d="M212 494L206 524M252 494L258 524" />
      <Shape d={blob({ cx: 232, cy: 410, rx: 64, ry: 88, taper: 0.1, seed: 12 })} color={BLUE} />
      <Hatch d={blob({ cx: 206, cy: 452, rx: 18, ry: 12, seed: 13 })} />
      <Motion kind="blink" phase={0.9}>
        <Motion kind="scan" amount={4}>
          <Eye x={232} y={376} />
          <Eye x={254} y={374} />
        </Motion>
      </Motion>
      <Line d="M236 398Q246 405 256 398" stroke={STROKE.regular} />
      <Line d="M180 420Q160 450 172 476" />

      {/* Slides the magnifier along the definition, pauses, comes back. */}
      <Motion kind="scan" amount={40}>
        <Line
          d={curve([
            [282, 392],
            [318, 368],
            [352, 338],
          ])}
        />
        <Line d="M352 338L366 324" stroke={STROKE.bold} />
        <Shape d={blob({ cx: 392, cy: 304, rx: 34, seed: 14, wobble: 0.02 })} opaque={false} />
        <Line d="M376 290Q384 282 394 282" stroke={STROKE.fine} />
        <Shape
          d={blob({ cx: 352, cy: 340, rx: 11, seed: 15 })}
          color={BLUE}
          stroke={STROKE.regular}
        />
      </Motion>
    </Illustration>
  );
}
