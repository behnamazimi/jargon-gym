import { blob, box, curve, polyline, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, ScribbleLines, Spark, Squiggle } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

// The shoulder the watering can tips from.
const SHOULDER = [512, 404] as const;

const LEAVES = [
  { x: 180, y: 362, angle: -28, seed: 2 },
  { x: 268, y: 352, angle: 24, seed: 3 },
  { x: 224, y: 292, angle: -6, seed: 4 },
];

const DROPS = [
  { x: 292, y: 396, phase: 0 },
  { x: 302, y: 404, phase: 0.15 },
  { x: 284, y: 410, phase: 0.3 },
];

function drop(x: number, y: number) {
  return `M${x} ${y}Q${x + 7} ${y + 10} ${x} ${y + 15}Q${x - 7} ${y + 10} ${x} ${y}Z`;
}

/** Someone small looking after a plant whose leaves are term cards: tips the can, the leaves perk up. */
export function AboutScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Motion kind="twinkle">
        <Spark x={630} y={190} r={20} rotate={10} />
      </Motion>
      <Motion kind="twinkle" phase={1.1}>
        <Spark x={150} y={230} r={16} rotate={-14} />
      </Motion>
      <Squiggle x={600} y={120} width={60} />
      <Dot x={190} y={150} r={7} color={YELLOW} />
      <Dot x={680} y={300} r={8} color={CORAL} ring />
      <Dot x={420} y={170} r={6} color={BLUE} />

      <Line d={wave(140, 524, 520, { amp: 2, period: 46, seed: 3 })} stroke={STROKE.regular} />

      {/* The plant: a stem of term cards in a pot. */}
      <g transform="translate(-40 0)">
        <Line
          d={curve([
            [260, 432],
            [254, 396],
            [262, 340],
          ])}
        />
        <Motion kind="perk" origin="50% 100%">
          {LEAVES.map((leaf) => (
            <g key={leaf.seed} transform={`rotate(${leaf.angle} ${leaf.x + 37} ${leaf.y + 23})`}>
              <Shape d={box(leaf.x, leaf.y, 74, 46, { seed: leaf.seed })} color={YELLOW} />
              <ScribbleLines
                x={leaf.x + 12}
                y={leaf.y + 16}
                width={50}
                lines={2}
                gap={13}
                seed={leaf.seed}
              />
            </g>
          ))}
        </Motion>
        <Shape
          d={polyline(
            [
              [206, 446],
              [314, 446],
              [300, 522],
              [220, 522],
            ],
            true,
          )}
          color={CORAL}
        />
        <Shape d={box(196, 428, 128, 24, { seed: 5 })} color={CORAL} />
        <Hatch d={blob({ cx: 252, cy: 494, rx: 22, ry: 12, seed: 6 })} />
      </g>

      {DROPS.map((d) => (
        <Motion key={d.x} kind="pour-drops" phase={d.phase}>
          <Shape d={drop(d.x, d.y)} color={BLUE} stroke={STROKE.fine} offset={[2, 2]} />
        </Motion>
      ))}

      {/* The gardener. */}
      <Line d="M538 506L532 524M584 506L590 524" />
      <Shape d={blob({ cx: 560, cy: 420, rx: 66, ry: 90, taper: 0.1, seed: 11 })} color={PURPLE} />
      <Line d="M620 430Q638 456 628 478" />
      <Motion kind="blink" phase={1.6}>
        <Eye x={534} y={384} />
        <Eye x={556} y={382} />
      </Motion>
      <Line d="M536 404Q546 413 557 404" stroke={STROKE.regular} />

      {/* Tips the can from the shoulder over the plant, then brings it back. */}
      <Motion kind="pour" pivot={SHOULDER}>
        <Line
          d={curve([
            [SHOULDER[0], SHOULDER[1]],
            [488, 372],
            [462, 336],
          ])}
        />
        <Line d="M394 302Q422 270 450 302" />
        <Shape d={box(372, 300, 84, 58, { seed: 4 })} color={BLUE} />
        <Hatch d={blob({ cx: 400, cy: 338, rx: 18, ry: 10, seed: 8 })} />
        <Line d="M374 322L328 292" stroke={STROKE.bold} />
        <Shape
          d={blob({ cx: 322, cy: 289, rx: 10, ry: 8, seed: 9 })}
          color={BLUE}
          stroke={STROKE.regular}
        />
        <Shape
          d={blob({ cx: 460, cy: 332, rx: 11, seed: 10 })}
          color={PURPLE}
          stroke={STROKE.regular}
        />
      </Motion>
    </Illustration>
  );
}
