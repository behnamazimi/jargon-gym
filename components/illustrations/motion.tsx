import type { CSSProperties, ReactNode } from "react";

type MotionKind =
  // Ambient
  | "breathe"
  | "look"
  | "blink"
  | "twinkle"
  | "flutter"
  // Actions (see illustrations.css for which ones share a beat)
  | "scan"
  | "think"
  | "flip-front"
  | "flip-back"
  | "cheer"
  | "cheer-arm"
  | "cheer-flash"
  | "toss"
  | "toss-arm"
  | "toss-card"
  | "toss-eyes"
  | "press"
  | "shake"
  | "ring"
  | "drop"
  | "drip"
  | "nod"
  | "sip"
  | "steam"
  | "emerge"
  | "emerge-card"
  | "emerge-squash"
  | "emerge-waggle"
  | "peek-face"
  | "happy-face"
  | "burst";

type MotionProps = {
  kind: MotionKind;
  /** Seconds into the loop this one starts, so neighbours don't move in lockstep. */
  phase?: number;
  /** Loop length in seconds, when the kind's default doesn't fit. */
  duration?: number;
  /** How far it moves: pixels for shifts, degrees for turns (see each kind in illustrations.css). */
  amount?: number;
  /** Flip the move's direction, so one kind serves both a left and a right limb. */
  mirror?: boolean;
  /** Pivot for turns and scales, as a CSS transform-origin within the group's own box. */
  origin?: string;
  /** Pivot as a point in the drawing's coordinates, e.g. a shoulder. */
  pivot?: readonly [number, number];
  children: ReactNode;
};

/**
 * Animates its children with one of the looping moves in illustrations.css.
 * Wrap a group that has no transform of its own: the animation replaces it.
 */
export function Motion({
  kind,
  phase = 0,
  duration,
  amount,
  mirror,
  origin,
  pivot,
  children,
}: MotionProps) {
  const style: Record<string, string | number> = { "--ill-delay": `${-phase}s` };
  if (duration !== undefined) style["--ill-duration"] = `${duration}s`;
  if (amount !== undefined) style["--ill-amount"] = amount;
  if (mirror) style["--ill-dir"] = -1;
  if (origin) style["--ill-origin"] = origin;
  if (pivot) {
    style["--ill-box"] = "view-box";
    style["--ill-origin"] = `${pivot[0]}px ${pivot[1]}px`;
  }

  return (
    <g className={`ill-motion ill-${kind}`} style={style as CSSProperties}>
      {children}
    </g>
  );
}
