import type { CSSProperties, ReactNode } from "react";

type MotionKind =
  // Ambient
  | "bob"
  | "wiggle"
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
  | "scribe"
  | "write-1"
  | "write-2"
  | "write-3"
  | "done-flash"
  | "search"
  | "shrug"
  | "shrug-arm-rest"
  | "shrug-arm-up"
  | "face-turn"
  | "surprise-eyes"
  | "surprise-brows"
  | "surprise-marks"
  | "wave-search"
  | "reach"
  | "signal-1"
  | "signal-2"
  | "signal-3"
  | "topple"
  | "fall-top"
  | "fall-next"
  | "fall-dashes"
  | "flinch"
  | "flinch-arm"
  | "flinch-eyes"
  | "peek-lean"
  | "box-shake"
  | "look-up"
  | "drift-in"
  | "celebrate-hop"
  | "celebrate-squash"
  | "lift-bar"
  | "lift-arms"
  | "lift-squash"
  | "emerge"
  | "emerge-card"
  | "emerge-squash"
  | "emerge-waggle"
  | "peek-face"
  | "happy-face"
  | "burst"
  | "pour"
  | "pour-drops"
  | "perk"
  | "pass-card"
  | "puzzle-mark"
  | "click-spark"
  | "say"
  | "slide-cup"
  | "fetch-arm"
  | "fetch-box"
  | "fetch-level"
  | "fetch-face"
  | "fetch-turn"
  | "fetch-solo"
  | "fetch-offer"
  | "fetch-handoff"
  | "import-drop"
  | "import-slide"
  | "import-bump"
  | "import-spark"
  | "import-flick"
  | "import-eyes"
  | "learn-say"
  | "learn-gesture"
  | "learn-unfold-side"
  | "learn-unfold-down"
  | "learn-link"
  | "hear-play"
  | "hear-sound"
  | "hear-listen"
  | "hear-glance"
  | "hear-speak"
  | "hear-echo"
  | "hear-mouth-open"
  | "hear-mouth-shut"
  | "story-tap"
  | "story-define"
  | "story-tap-spark"
  | "story-glow"
  | "calm-flip"
  | "calm-glance"
  | "practice-grow"
  | "practice-arm"
  | "practice-flip-front"
  | "practice-flip-back"
  | "practice-eyes"
  | "practice-rest"
  | "listen-arcs";

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
  // Custom properties inherit, so a nested Motion would otherwise pick up its
  // parent's pivot, size or direction. "initial" falls back to the kind's default.
  const style: Record<string, string | number> = {
    "--ill-delay": `${-phase}s`,
    "--ill-duration": duration === undefined ? "initial" : `${duration}s`,
    "--ill-amount": amount ?? "initial",
    "--ill-dir": mirror ? -1 : 1,
    "--ill-box": pivot ? "view-box" : "fill-box",
    "--ill-origin": pivot ? `${pivot[0]}px ${pivot[1]}px` : (origin ?? "center"),
  };

  return (
    <g className={`ill-motion ill-${kind}`} style={style as CSSProperties}>
      {children}
    </g>
  );
}
