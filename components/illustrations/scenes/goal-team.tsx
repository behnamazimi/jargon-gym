import type { GoalLevel, GoalTier } from "@/lib/goals/levels";
import { blob, box, quad, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Eye } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, INK, PURPLE, YELLOW } from "../palette";
import { Line, Shape } from "../shape";

/** Thinner ink than the full-size scenes: these draw small. */
const WEIGHT = { body: 3.4, detail: 2.6, fine: 2 };
const OFFSET = [3.5, 3] as const;

/** Each tier's lobya: Lobyar reads, Lobyare reviews, Lobyaq quizzes. */
export const GOAL_LOBYAS: Record<GoalTier, { color: string; seed: number }> = {
  read: { color: CORAL, seed: 8 },
  review: { color: PURPLE, seed: 6 },
  quiz: { color: BLUE, seed: 3 },
};

/** What each lobya carries for its job: a book, a card, a checked answer. */
export function GoalProp({ tier, x, y }: { tier: GoalTier; x: number; y: number }) {
  if (tier === "read") {
    return (
      <g>
        <Shape
          d={quad([
            [x - 22, y - 10],
            [x, y - 4],
            [x, y + 16],
            [x - 22, y + 10],
          ])}
          color={YELLOW}
          stroke={WEIGHT.detail}
          offset={[3, 3]}
        />
        <Shape
          d={quad([
            [x, y - 4],
            [x + 22, y - 10],
            [x + 22, y + 10],
            [x, y + 16],
          ])}
          color={YELLOW}
          stroke={WEIGHT.detail}
          offset={[3, 3]}
        />
      </g>
    );
  }
  if (tier === "review") {
    // Two flashcards fanned out, with a flip arrow over them.
    return (
      <g>
        <g transform={`rotate(-14 ${x} ${y})`}>
          <Shape
            d={box(x - 18, y - 20, 30, 40, { seed: 7, bow: 2 })}
            color={YELLOW}
            stroke={WEIGHT.detail}
            offset={[3, 3]}
          />
        </g>
        <g transform={`rotate(8 ${x} ${y})`}>
          <Shape
            d={box(x - 10, y - 18, 30, 40, { seed: 4, bow: 2 })}
            color={BLUE}
            stroke={WEIGHT.detail}
            offset={[3, 3]}
          />
          <Line d={wave(x - 4, y + 2, 18, { amp: 2, period: 8, seed: 2 })} stroke={WEIGHT.fine} />
        </g>
        <Line
          d={`M${x - 14} ${y - 30}Q${x + 2} ${y - 44} ${x + 16} ${y - 30}M${x + 9} ${y - 33}L${x + 16} ${y - 30}L${x + 14} ${y - 38}`}
          stroke={WEIGHT.fine}
        />
      </g>
    );
  }
  return (
    <g transform={`rotate(6 ${x} ${y})`}>
      <Shape
        d={box(x - 20, y - 16, 40, 32, { seed: 5, bow: 2 })}
        color={YELLOW}
        stroke={WEIGHT.detail}
        offset={[3, 3]}
      />
      <Line d={`M${x - 9} ${y}L${x - 2} ${y + 7}L${x + 10} ${y - 7}`} stroke={WEIGHT.detail} />
    </g>
  );
}

/** Speed of each awake pose: seconds per bob and how high it goes. */
const PACE: Record<Exclude<GoalLevel, "off">, { duration: number; amount: number }> = {
  light: { duration: 1.6, amount: 3 },
  steady: { duration: 0.6, amount: 5 },
  intense: { duration: 0.36, amount: 6 },
};

/**
 * A tier's lobya at the pace its goal sets: napping beside its prop when the
 * goal is off, then strolling, jogging or sprinting with it.
 */
export function GoalLobyaScene({
  tier,
  level,
  className,
}: {
  tier: GoalTier;
  level: GoalLevel;
  className?: string;
}) {
  const { color, seed } = GOAL_LOBYAS[tier];

  if (level === "off") {
    return (
      <Illustration viewBox="0 0 200 200" className={className}>
        <Line d={wave(20, 186, 160, { amp: 2, period: 36, seed })} stroke={WEIGHT.detail} />
        <GoalProp tier={tier} x={160} y={166} />
        <Motion kind="breathe" origin="50% 100%">
          <Shape
            offset={OFFSET}
            stroke={WEIGHT.body}
            d={blob({ cx: 90, cy: 146, rx: 52, ry: 38, taper: 0.1, seed })}
            color={color}
          />
          <Line d="M70 140Q77 146 84 140M96 138Q103 144 110 138" stroke={WEIGHT.detail} />
          <Line d="M84 158Q90 162 96 158" stroke={WEIGHT.fine} />
        </Motion>
        <Motion kind="twinkle">
          <Line d="M128 70L142 70L128 84L142 84" stroke={WEIGHT.fine} />
        </Motion>
        <Motion kind="twinkle" phase={0.8}>
          <Line d="M150 44L160 44L150 54L160 54" stroke={WEIGHT.fine} />
        </Motion>
      </Illustration>
    );
  }

  const { duration, amount } = PACE[level];
  const lean = level === "intense" ? 8 : level === "steady" ? 3 : 0;
  const legs =
    level === "light"
      ? "M88 166L84 186M112 166L118 186"
      : level === "steady"
        ? "M88 166L74 184M112 166L126 182"
        : "M88 166L62 178M112 166L138 176";

  return (
    <Illustration viewBox="0 0 200 200" className={className}>
      <Line d={wave(20, 188, 160, { amp: 2, period: 36, seed })} stroke={WEIGHT.detail} />
      {level !== "light" ? (
        <Line
          d={
            level === "intense"
              ? "M14 104L40 104M20 116L38 116M14 128L40 128"
              : "M20 110L38 110M20 122L38 122"
          }
          stroke={WEIGHT.detail}
        />
      ) : null}
      <Motion kind="bob" duration={duration} amount={amount}>
        <g transform={`rotate(${lean} 100 166)`}>
          <Line stroke={WEIGHT.body} d={legs} />
          <Line
            d={level === "light" ? "M62 124Q50 142 56 158" : "M62 120Q46 128 52 108"}
            stroke={WEIGHT.body}
          />
          <Shape
            offset={OFFSET}
            stroke={WEIGHT.body}
            d={blob({ cx: 100, cy: 118, rx: 40, ry: 50, taper: 0.1, seed })}
            color={color}
          />
          <Motion kind="blink" phase={seed * 0.3}>
            <Eye x={92} y={100} />
            <Eye x={112} y={98} />
          </Motion>
          {level === "intense" ? (
            <path d="M94 116Q103 128 112 116Z" style={{ fill: INK }} />
          ) : (
            <Line d="M92 116Q102 124 112 116" stroke={WEIGHT.detail} />
          )}
          <Line stroke={WEIGHT.body} d="M138 120Q152 112 154 100" />
          <GoalProp tier={tier} x={160} y={88} />
          {level === "intense" ? (
            <Motion kind="drip" phase={0.4}>
              <Shape d="M76 76Q82 85 76 90Q70 85 76 76Z" stroke={WEIGHT.fine} offset={[2, 2]} />
            </Motion>
          ) : null}
        </g>
      </Motion>
    </Illustration>
  );
}

/** Just the lobya's face, for small spots like the progress rings. */
export function GoalLobyaHead({ tier, className }: { tier: GoalTier; className?: string }) {
  const { color, seed } = GOAL_LOBYAS[tier];
  return (
    <Illustration viewBox="10 10 80 84" className={className}>
      <Shape
        offset={OFFSET}
        stroke={WEIGHT.body}
        d={blob({ cx: 50, cy: 54, rx: 30, ry: 34, taper: 0.1, seed })}
        color={color}
      />
      <Motion kind="blink" phase={seed * 0.3}>
        <Eye x={42} y={48} r={4.5} />
        <Eye x={58} y={46} r={4.5} />
      </Motion>
      <Line d="M42 62Q50 69 58 62" stroke={WEIGHT.detail} />
    </Illustration>
  );
}

/** A full turn starting at the top, measured as length 100 so a dash can show a percentage. */
const RING = "M60 12A48 48 0 1 1 59.99 12";

/**
 * Today's progress for one tier: a dotted ink track with the lobya's own
 * colour drawn round it as the goal fills, and a spark once it's met.
 */
export function GoalRing({
  tier,
  percent,
  met,
  off,
  className,
}: {
  tier: GoalTier;
  percent: number;
  met: boolean;
  off: boolean;
  className?: string;
}) {
  const { color, seed } = GOAL_LOBYAS[tier];
  const dash = `${Math.max(0, Math.min(100, percent))} 100`;

  return (
    <Illustration viewBox="0 0 120 120" className={className}>
      <path
        d={RING}
        pathLength={100}
        style={{
          fill: "none",
          stroke: INK,
          strokeWidth: WEIGHT.fine,
          strokeDasharray: "0 4.5",
          opacity: 0.6,
        }}
      />
      {percent > 0 ? (
        <>
          <path
            d={RING}
            pathLength={100}
            transform="translate(2.5 2)"
            style={{ fill: "none", stroke: color, strokeWidth: 9, strokeDasharray: dash }}
          />
          <path
            d={RING}
            pathLength={100}
            style={{ fill: "none", stroke: INK, strokeWidth: WEIGHT.detail, strokeDasharray: dash }}
          />
        </>
      ) : null}
      <g opacity={off ? 0.45 : 1}>
        <Shape
          offset={[3, 2.5]}
          stroke={WEIGHT.body}
          d={blob({ cx: 60, cy: 62, rx: 25, ry: 29, taper: 0.1, seed })}
          color={color}
        />
        <Motion kind="blink" phase={seed * 0.3}>
          <Eye x={53} y={57} r={3.8} />
          <Eye x={67} y={55} r={3.8} />
        </Motion>
        {met ? (
          <Line d="M50 66Q60 78 70 66" stroke={WEIGHT.detail} />
        ) : (
          <Line d="M53 69Q60 74 67 69" stroke={WEIGHT.detail} />
        )}
      </g>
      {met ? (
        <Motion kind="twinkle">
          <Line d="M104 2L104 12M104 18L104 26M92 14L100 14M108 14L116 14" stroke={WEIGHT.detail} />
        </Motion>
      ) : null}
    </Illustration>
  );
}
