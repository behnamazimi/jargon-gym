import { blob, box, curve, quad, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, DottedPath, Eye, ScribbleLines, Spark, Squiggle } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

// The shoulder the arm holding the list swings from.
const SHOULDER = [236, 404] as const;

const LIST_ROWS = [236, 254, 272, 290];

const DECK = [
  { tilt: -7, color: PURPLE, seed: 21 },
  { tilt: 5, color: BLUE, seed: 22 },
  { tilt: 0, color: undefined, seed: 23 },
];

/** Bringing terms in is easy: a pasted list dropped into an open box, a deck from another app sliding in after it. */
export function BringTermsInScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Motion kind="twinkle">
        <Spark x={130} y={180} r={18} rotate={8} />
      </Motion>
      <Squiggle x={420} y={120} width={70} rotate={-8} seed={3} />
      <Dot x={250} y={120} r={7} color={YELLOW} />
      <Dot x={720} y={430} r={8} color={CORAL} ring />
      <Dot x={560} y={470} r={6} color={PURPLE} />

      <Line d={wave(100, 526, 600, { amp: 2, period: 44, seed: 4 })} stroke={STROKE.regular} />

      <OtherApp />

      {/* The open box: back flap, the dark inside, the side flaps. */}
      <Shape
        d={quad(
          [
            [330, 352],
            [470, 352],
            [482, 390],
            [318, 390],
          ],
          { seed: 5, bow: 2 },
        )}
        color={YELLOW}
      />
      <Shape
        d={quad(
          [
            [318, 390],
            [482, 390],
            [500, 430],
            [300, 430],
          ],
          { seed: 6, bow: 1 },
        )}
      />
      <Hatch
        d={quad([
          [322, 394],
          [478, 394],
          [494, 426],
          [306, 426],
        ])}
        cross
      />
      <Shape
        d={quad(
          [
            [318, 390],
            [300, 430],
            [246, 410],
            [268, 372],
          ],
          { seed: 7, bow: 2 },
        )}
        color={YELLOW}
      />
      <Shape
        d={quad(
          [
            [482, 390],
            [532, 372],
            [554, 410],
            [500, 430],
          ],
          { seed: 8, bow: 2 },
        )}
        color={YELLOW}
      />

      {/* Let go over the box, the list falls in. */}
      <Motion kind="import-drop">
        <PastedList />
      </Motion>

      {/* The deck from the other app follows it in. */}
      <Motion kind="import-slide">
        <Deck />
      </Motion>

      <Motion kind="import-bump" origin="50% 100%">
        <Shape
          d={quad(
            [
              [300, 430],
              [500, 430],
              [494, 524],
              [306, 524],
            ],
            { seed: 9, bow: 2 },
          )}
          color={YELLOW}
        />
        <Hatch d={blob({ cx: 456, cy: 498, rx: 22, ry: 12, seed: 10 })} />
      </Motion>
      <Motion kind="import-spark">
        <Spark x={400} y={330} r={24} rays={7} />
      </Motion>

      <Packer />
    </Illustration>
  );
}

function PastedList() {
  return (
    <g>
      <Shape d={box(318, 214, 64, 88, { seed: 11 })} />
      {LIST_ROWS.map((y, i) => (
        <g key={y}>
          <Dot x={332} y={y} r={3.5} />
          <Line
            d={wave(342, y, i === LIST_ROWS.length - 1 ? 18 : 28, { amp: 2, period: 12, seed: y })}
            stroke={STROKE.fine}
          />
        </g>
      ))}
    </g>
  );
}

function OtherApp() {
  return (
    <g>
      <Shape d={box(600, 196, 156, 136, { seed: 12 })} />
      <Shape d={box(600, 196, 156, 28, { seed: 13, bow: 1 })} color={CORAL} />
      <Dot x={616} y={210} r={4} />
      <Dot x={630} y={210} r={4} />
      <Dot x={644} y={210} r={4} />
      <Hatch d={blob({ cx: 728, cy: 312, rx: 16, ry: 10, seed: 14 })} />
      <DottedPath
        moving
        d={curve([
          [592, 292],
          [544, 282],
          [500, 320],
        ])}
      />
    </g>
  );
}

function Deck() {
  return (
    <g>
      {DECK.map(({ tilt, color, seed }) => (
        <g key={seed} transform={`rotate(${tilt} 678 282)`}>
          <Shape d={box(642, 258, 72, 48, { seed })} color={color} stroke={STROKE.regular} />
        </g>
      ))}
      <ScribbleLines x={654} y={274} width={46} lines={2} gap={13} seed={24} />
    </g>
  );
}

function Packer() {
  return (
    <g>
      <Line d="M166 504L160 526M206 504L212 526" />
      <Line d="M136 430Q116 460 128 488" />
      <Shape d={blob({ cx: 186, cy: 430, rx: 58, ry: 82, taper: 0.1, seed: 15 })} color={BLUE} />
      <Hatch d={blob({ cx: 160, cy: 470, rx: 18, ry: 12, seed: 16 })} />
      <Motion kind="blink" phase={2.2}>
        <Motion kind="import-eyes">
          <Eye x={204} y={394} />
          <Eye x={226} y={392} />
        </Motion>
      </Motion>
      <Line d="M206 414Q217 422 228 412" stroke={STROKE.regular} />

      {/* Holds the list up over the box and lets it go. */}
      <Motion kind="import-flick" pivot={SHOULDER}>
        <Line
          d={curve([
            [SHOULDER[0], SHOULDER[1]],
            [276, 352],
            [314, 304],
          ])}
        />
        <Shape
          d={blob({ cx: 318, cy: 298, rx: 10, seed: 17 })}
          color={BLUE}
          stroke={STROKE.regular}
        />
      </Motion>
    </g>
  );
}
