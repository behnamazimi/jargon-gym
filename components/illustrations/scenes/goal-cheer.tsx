import { GOAL_TIERS, type GoalTier } from "@/lib/goals/levels";
import { blob, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Fleck, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, INK, PURPLE, YELLOW } from "../palette";
import { Line, Shape } from "../shape";
import { GOAL_LOBYAS, GoalProp } from "./goal-team";

/** Thinner ink than the full-size scenes: these draw small. */
const WEIGHT = { body: 4.2, detail: 3.2, fine: 2.4 };
const OFFSET = [4, 3.5] as const;

const CONFETTI = [
  { x: 92, y: 70, angle: 30, color: CORAL },
  { x: 150, y: 34, angle: -40, color: YELLOW },
  { x: 250, y: 30, angle: 20, color: BLUE },
  { x: 318, y: 74, angle: -30, color: PURPLE },
  { x: 60, y: 136, angle: 60, color: YELLOW },
  { x: 342, y: 140, angle: -60, color: CORAL },
  { x: 200, y: 18, angle: 80, color: PURPLE },
  { x: 118, y: 110, angle: -20, color: BLUE },
  { x: 284, y: 112, angle: 40, color: YELLOW },
];

/** One lobya cheering with both arms up. The leader also holds up its prop. */
function Cheerer({
  tier,
  x,
  scale,
  hop,
  phase,
  withProp,
}: {
  tier: GoalTier;
  x: number;
  scale: number;
  hop: boolean;
  phase: number;
  withProp: boolean;
}) {
  const { color, seed } = GOAL_LOBYAS[tier];
  const body = (
    <>
      <Line stroke={WEIGHT.body} d="M88 250L84 268M112 250L116 268" />
      <Line
        stroke={WEIGHT.body}
        d={
          withProp
            ? "M74 194Q58 150 80 112M126 194Q142 150 120 110"
            : "M74 194Q56 160 66 126M126 194Q144 160 134 124"
        }
      />
      <Motion kind={hop ? "celebrate-squash" : "breathe"} origin="50% 100%" phase={phase}>
        <Shape
          offset={OFFSET}
          stroke={WEIGHT.body}
          d={blob({ cx: 100, cy: 204, rx: 40, ry: 52, taper: 0.1, seed })}
          color={color}
        />
        <Line d="M80 188Q86 180 92 188M104 186Q110 178 116 186" stroke={WEIGHT.detail} />
        <path d="M88 202Q99 222 112 201Z" style={{ fill: INK }} />
      </Motion>
      {withProp ? (
        <GoalProp tier={tier} x={100} y={104} />
      ) : (
        <>
          <Shape
            offset={OFFSET}
            d={blob({ cx: 66, cy: 122, rx: 8, seed: seed + 1 })}
            color={color}
            stroke={WEIGHT.detail}
          />
          <Shape
            offset={OFFSET}
            d={blob({ cx: 134, cy: 120, rx: 8, seed: seed + 2 })}
            color={color}
            stroke={WEIGHT.detail}
          />
        </>
      )}
    </>
  );

  return (
    <g transform={`translate(${x - 100 * scale} ${270 - 270 * scale}) scale(${scale})`}>
      <Motion kind={hop ? "celebrate-hop" : "bob"} phase={phase} duration={hop ? undefined : 0.8}>
        {body}
      </Motion>
    </g>
  );
}

/**
 * A daily goal met: the tier's own lobya hops in the middle with its prop
 * while the other two cheer. When it's the last goal of the day, all three hop.
 */
export function GoalCheerScene({
  lead,
  all,
  className,
  title,
}: {
  lead: GoalTier;
  all: boolean;
  className?: string;
  title?: string;
}) {
  const [left, right] = GOAL_TIERS.filter((tier) => tier !== lead);

  return (
    <Illustration viewBox="0 0 400 300" className={className} title={title}>
      {CONFETTI.map((fleck, i) => (
        <Motion key={`${fleck.x}-${fleck.y}`} kind="flutter" phase={i * 0.35}>
          <Fleck {...fleck} />
        </Motion>
      ))}
      <Motion kind="twinkle" phase={0.4}>
        <Spark x={40} y={60} r={14} />
      </Motion>
      <Motion kind="twinkle" phase={1.2}>
        <Spark x={362} y={44} r={12} />
      </Motion>
      <Line d={wave(40, 272, 320, { amp: 2, period: 40, seed: 5 })} stroke={WEIGHT.detail} />

      <Cheerer tier={left} x={92} scale={0.72} hop={all} phase={0.3} withProp={false} />
      <Cheerer tier={right} x={308} scale={0.72} hop={all} phase={0.6} withProp={false} />
      <Cheerer tier={lead} x={200} scale={1} hop phase={0} withProp />
    </Illustration>
  );
}
