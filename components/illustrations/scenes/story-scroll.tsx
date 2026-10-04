import { blob, box, curve, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, ScribbleLines, Spark, Squiggle } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

// The shoulder the tapping arm swings from.
const SHOULDER = [250, 420] as const;

const ROWS = [128, 156, 184, 212, 240, 268, 296, 324, 352, 380, 408, 436, 464];
const LINE = { from: 352, to: 518 };

// Words in the story that glow; the middle one is the one being tapped.
const GLOWS = [
  { y: 156, x: 446, w: 58 },
  { y: 324, x: 362, w: 54, tapped: true },
  { y: 436, x: 424, w: 62 },
];

/** Reading in context: a long story with a few words glowing, and a tap opens one's definition. */
export function StoryScrollScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Motion kind="twinkle">
        <Spark x={660} y={140} r={18} rotate={10} />
      </Motion>
      <Squiggle x={90} y={190} width={70} rotate={-10} seed={5} />
      <Dot x={150} y={300} r={7} color={YELLOW} />
      <Dot x={690} y={430} r={8} color={BLUE} ring />
      <Dot x={610} y={500} r={6} color={CORAL} />

      <Line d={wave(100, 526, 600, { amp: 2, period: 44, seed: 2 })} stroke={STROKE.regular} />

      <Scroll />
      <Reader />

      {/* The definition opens over the word that was tapped. */}
      <Motion kind="story-define" origin="0% 100%">
        <Shape d={box(392, 204, 196, 94, { seed: 3, bow: 4 })} color={YELLOW} />
        <Line d="M404 296L388 318L432 296" stroke={STROKE.regular} />
        <Line d={wave(410, 230, 84, { amp: 3, period: 26, seed: 4 })} stroke={8} />
        <ScribbleLines x={410} y={256} width={156} lines={2} gap={18} seed={5} />
      </Motion>
      <Motion kind="story-tap-spark">
        <Spark x={350} y={340} r={20} rays={6} rotate={-10} />
      </Motion>
    </Illustration>
  );
}

function Scroll() {
  return (
    <g>
      <Shape d={box(330, 92, 210, 414, { seed: 6, bow: 4 })} />
      <Hatch d={blob({ cx: 508, cy: 484, rx: 16, ry: 10, seed: 7 })} />
      {ROWS.map((y, i) => {
        const glow = GLOWS.find((g) => g.y === y);
        if (!glow) {
          const to = i % 4 === 3 ? LINE.to - 60 : LINE.to;
          return (
            <Line
              key={y}
              d={wave(LINE.from, y, to - LINE.from, { amp: 2.5, period: 14, seed: y })}
              stroke={STROKE.fine}
            />
          );
        }
        const word = `M${glow.x - 2} ${y}L${glow.x + glow.w + 2} ${y}`;
        return (
          <g key={y}>
            {glow.x - LINE.from > 20 ? (
              <Line
                d={wave(LINE.from, y, glow.x - LINE.from - 12, { amp: 2.5, period: 14, seed: y })}
                stroke={STROKE.fine}
              />
            ) : null}
            {glow.tapped ? (
              <Line d={word} stroke={22} color={YELLOW} />
            ) : (
              <Motion kind="story-glow" phase={y / 200}>
                <Line d={word} stroke={22} color={YELLOW} />
              </Motion>
            )}
            <Line d={wave(glow.x, y, glow.w, { amp: 2.5, period: 18, seed: y + 1 })} stroke={6} />
            <Line
              d={wave(glow.x + glow.w + 12, y, LINE.to - glow.x - glow.w - 12, {
                amp: 2.5,
                period: 14,
                seed: y + 2,
              })}
              stroke={STROKE.fine}
            />
          </g>
        );
      })}
      <Shape d={box(314, 76, 242, 30, { seed: 8 })} color={CORAL} />
      <Shape d={box(314, 494, 242, 30, { seed: 9 })} color={CORAL} />
    </g>
  );
}

function Reader() {
  return (
    <g>
      <Line d="M180 504L174 526M220 504L226 526" />
      <Line d="M150 444Q132 474 144 498" />
      <Shape d={blob({ cx: 200, cy: 440, rx: 58, ry: 82, taper: 0.1, seed: 10 })} color={PURPLE} />
      <Hatch d={blob({ cx: 176, cy: 480, rx: 18, ry: 12, seed: 11 })} />
      <Motion kind="blink" phase={1.4}>
        <Motion kind="look" amount={3} duration={1.8}>
          <Eye x={216} y={404} />
          <Eye x={238} y={402} />
        </Motion>
      </Motion>
      <Line d="M218 424Q229 432 240 422" stroke={STROKE.regular} />

      {/* Reaches over and taps the glowing word. */}
      <Motion kind="story-tap" pivot={SHOULDER}>
        <Line
          d={curve([
            [SHOULDER[0], SHOULDER[1]],
            [300, 384],
            [352, 334],
          ])}
        />
        <Shape
          d={blob({ cx: 358, cy: 328, rx: 9, seed: 12 })}
          color={PURPLE}
          stroke={STROKE.regular}
        />
      </Motion>
    </g>
  );
}
