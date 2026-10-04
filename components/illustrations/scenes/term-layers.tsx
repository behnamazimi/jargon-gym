import { blob, box, curve, polyline, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, DottedPath, Eye, ScribbleLines, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

// The shoulder the gesturing arm swings from.
const SHOULDER = [240, 432] as const;

/** A term is more than a definition: someone uses the word, and its card unfolds an example,
 *  a picture and a link to a neighbouring term. */
export function TermLayersScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Motion kind="twinkle">
        <Spark x={640} y={170} r={18} rotate={12} />
      </Motion>
      <Motion kind="twinkle" phase={1.2}>
        <Spark x={92} y={300} r={15} rotate={-8} />
      </Motion>
      <Dot x={720} y={260} r={7} color={YELLOW} />
      <Dot x={470} y={150} r={6} color={PURPLE} ring />

      <Line d={wave(100, 530, 600, { amp: 2, period: 44, seed: 2 })} stroke={STROKE.regular} />

      {/* Says the word; the bubble points it at the card. */}
      <Motion kind="learn-say" origin="30% 100%">
        <Shape d={box(70, 110, 250, 120, { seed: 3, bow: 6 })} />
        <Line d="M152 228L194 314L206 228" stroke={STROKE.regular} />
        <Line d={wave(96, 150, 196, { amp: 2.5, period: 14, seed: 4 })} stroke={STROKE.fine} />
        <Line d={wave(96, 194, 60, { amp: 2.5, period: 14, seed: 5 })} stroke={STROKE.fine} />
        <Line d="M180 194L266 194" stroke={24} color={YELLOW} />
        <Line d={wave(182, 194, 82, { amp: 3, period: 24, seed: 6 })} stroke={7} />
        <DottedPath
          moving
          d={curve([
            [326, 176],
            [366, 186],
            [394, 222],
          ])}
        />
      </Motion>

      <TermCard />
      <Speaker />
    </Illustration>
  );
}

function TermCard() {
  return (
    <g>
      {/* The definition. */}
      <Shape d={box(400, 230, 150, 110, { seed: 7 })} color={YELLOW} />
      <Line d={wave(418, 258, 90, { amp: 3, period: 26, seed: 8 })} stroke={8} />
      <ScribbleLines x={418} y={286} width={112} lines={3} gap={16} seed={9} />

      {/* An example, folding out to the side. */}
      <Motion kind="learn-unfold-side" origin="0% 50%">
        <Shape d={box(550, 230, 120, 110, { seed: 10 })} color={BLUE} />
        <Line d="M570 250L566 262M582 250L578 262" stroke={STROKE.regular} />
        <ScribbleLines x={572} y={280} width={78} lines={3} gap={16} seed={11} />
      </Motion>

      {/* A picture, folding down. */}
      <Motion kind="learn-unfold-down" origin="50% 0%">
        <Shape d={box(400, 340, 150, 100, { seed: 12 })} color={PURPLE} />
        <Line
          d={polyline([
            [420, 422],
            [458, 372],
            [482, 400],
            [502, 382],
            [532, 422],
          ])}
          stroke={STROKE.regular}
        />
        <Dot x={512} y={362} r={9} ring />
      </Motion>

      {/* And a link out to a neighbouring term. */}
      <Motion kind="learn-link">
        <DottedPath
          d={curve([
            [614, 346],
            [622, 374],
            [640, 400],
          ])}
        />
        <g transform="rotate(6 640 434)">
          <Shape d={box(592, 404, 100, 64, { seed: 13 })} color={CORAL} />
          <ScribbleLines x={606} y={424} width={70} lines={2} gap={14} seed={14} />
        </g>
      </Motion>
    </g>
  );
}

function Speaker() {
  return (
    <g>
      <Line d="M170 508L164 528M210 508L216 528" />
      <Line d="M136 444Q118 474 130 498" />
      <Shape d={blob({ cx: 190, cy: 436, rx: 58, ry: 82, taper: 0.1, seed: 15 })} color={CORAL} />
      <Hatch d={blob({ cx: 164, cy: 476, rx: 18, ry: 12, seed: 16 })} />
      <Motion kind="blink" phase={1.8}>
        <Eye x={206} y={400} />
        <Eye x={228} y={398} />
      </Motion>
      <Shape d={blob({ cx: 220, cy: 424, rx: 8, ry: 6, seed: 17 })} stroke={STROKE.regular} />

      <Motion kind="learn-gesture" pivot={SHOULDER}>
        <Line
          d={curve([
            [SHOULDER[0], SHOULDER[1]],
            [284, 414],
            [320, 382],
          ])}
        />
        <Shape
          d={blob({ cx: 324, cy: 378, rx: 10, seed: 18 })}
          color={CORAL}
          stroke={STROKE.regular}
        />
      </Motion>
    </g>
  );
}
