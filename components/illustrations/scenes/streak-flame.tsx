import type { ReactNode } from "react";
import { blob, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, Face, Spark } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Line, Shape, STROKE } from "../shape";

export type StreakFlameState = "done" | "open" | "none";

// This viewBox is about 0.7 times as wide as other small scenes, so every
// stroke is one weight lighter, and fills sit closer to their outlines, to
// look the same on screen.
const INK_FINE = 2.2;
const MISREGISTER = [4, 3.5] as const;

const GROUND = 272;
const FEET = [160, GROUND] as const;
const FLAME_BASE = [250, 250] as const;
const LEFT_SHOULDER = [140, 214] as const;
const RIGHT_SHOULDER = [180, 212] as const;

/** A teardrop flame standing `lift` above FLAME_BASE, `w` and `h` times the base size. */
function flame(w: number, h: number, lift = 0) {
  const [x, y0] = FLAME_BASE;
  const y = y0 - lift;
  const p = (dx: number, dy: number) => `${x + dx * w} ${y + dy * h}`;
  return (
    `M${p(0, 4)}` +
    `C${p(-20, 4)} ${p(-22, -22)} ${p(-8, -40)}` +
    `C${p(-2, -48)} ${p(0, -56)} ${p(2, -66)}` +
    `C${p(8, -50)} ${p(22, -36)} ${p(20, -16)}` +
    `C${p(18, -2)} ${p(10, 4)} ${p(0, 4)}Z`
  );
}

/**
 * A flame with an inner core. The outer flame and the core each flicker on
 * their own uneven loops, so the core shifts inside the flame.
 */
function Flame({ size, flicker = 1 }: { size: number; flicker?: number }) {
  return (
    <Motion kind="flame-sway" pivot={FLAME_BASE} amount={flicker}>
      <Motion kind="flame-lick" pivot={FLAME_BASE}>
        <Shape offset={MISREGISTER} d={flame(size, size)} color={CORAL} stroke={STROKE.fine} />
        <Motion kind="flame-sway" pivot={FLAME_BASE} duration={1.3} phase={0.4} amount={flicker}>
          <Motion kind="flame-lick" pivot={FLAME_BASE} duration={0.53} phase={0.2}>
            <Shape
              offset={MISREGISTER}
              d={flame(size * 0.5, size * 0.55, 2)}
              color={YELLOW}
              stroke={INK_FINE}
              opaque={false}
            />
          </Motion>
        </Motion>
      </Motion>
    </Motion>
  );
}

/** A small bowl on the ground, drawn over the flame so its base sits inside. */
function Cup() {
  return (
    <Shape
      offset={MISREGISTER}
      d={`M215 236Q220 ${GROUND} 250 ${GROUND}Q280 ${GROUND} 285 236Q268 246 250 246Q232 246 215 236Z`}
      color={BLUE}
      stroke={STROKE.fine}
    />
  );
}

/** Lobyare, small and standing just left of the cup, facing it. Arms start
 *  inside the body and are drawn behind it, so only the limb shows. */
function Lobyare({ face, arms }: { face: ReactNode; arms: ReactNode }) {
  return (
    <>
      <Line d={`M150 254L146 ${GROUND}M170 254L174 ${GROUND}`} stroke={STROKE.regular} />
      {arms}
      <Shape
        offset={MISREGISTER}
        d={blob({ cx: 160, cy: 214, rx: 32, ry: 42, taper: 0.1, seed: 21 })}
        color={PURPLE}
        stroke={STROKE.regular}
      />
      {face}
    </>
  );
}

const RESTING_ARMS = (
  <Line
    d={`M${LEFT_SHOULDER[0]} ${LEFT_SHOULDER[1]}Q118 228 120 248M${RIGHT_SHOULDER[0]} ${RIGHT_SHOULDER[1]}Q204 226 200 246`}
    stroke={STROKE.regular}
  />
);

/**
 * For the streak modal: Lobyare next to a small flame in a bowl.
 * "done" (today counts): a full flame, and Lobyare hops with its arms up.
 * "open" (the streak waits on today): a low flame Lobyare blows on until
 * it flares. "none" (no streak): a cold bowl with a curl of smoke.
 */
export function StreakFlameScene({
  state,
  className,
}: {
  state: StreakFlameState;
  className?: string;
}) {
  return (
    <Illustration className={className} viewBox="90 96 236 190">
      <Line d={wave(100, GROUND + 2, 216, { amp: 2, period: 36, seed: 3 })} stroke={STROKE.fine} />
      <Dot x={108} y={128} r={5} color={CORAL} />
      <Line d={wave(282, 120, 28, { amp: 4, period: 26, seed: 4 })} stroke={STROKE.fine} />
      {state === "done" ? <Done /> : state === "open" ? <Open /> : <None />}
    </Illustration>
  );
}

function Done() {
  return (
    <>
      <Motion kind="hop-body" pivot={FEET}>
        <Lobyare
          arms={
            <>
              <Motion kind="wiggle" pivot={LEFT_SHOULDER} amount={10} duration={0.8}>
                <Line
                  d={`M${LEFT_SHOULDER[0]} ${LEFT_SHOULDER[1]}Q118 204 114 186`}
                  stroke={STROKE.regular}
                />
                <Dot x={113} y={182} r={6} color={PURPLE} />
              </Motion>
              <Motion kind="wiggle" pivot={RIGHT_SHOULDER} amount={10} duration={0.8} mirror>
                <Line
                  d={`M${RIGHT_SHOULDER[0]} ${RIGHT_SHOULDER[1]}Q202 202 206 184`}
                  stroke={STROKE.regular}
                />
                <Dot x={207} y={180} r={6} color={PURPLE} />
              </Motion>
            </>
          }
          face={
            <Face>
              <Line
                d="M161 204Q166 198 171 204M177 202Q182 196 187 202M168 216Q178 225 188 214"
                stroke={STROKE.fine}
              />
            </Face>
          }
        />
      </Motion>
      <Flame size={1.4} />
      <Motion kind="flame-tongue" pivot={[252, 156]} phase={1.1}>
        <Shape offset={MISREGISTER} d={flame(0.35, 0.35, 92)} color={CORAL} stroke={INK_FINE} />
      </Motion>
      <Motion kind="ember-float" phase={0.3}>
        <Motion kind="ember-drift">
          <Dot x={244} y={152} r={3.5} color={CORAL} />
        </Motion>
      </Motion>
      <Motion kind="ember-float" duration={2.7} phase={1.6} amount={60}>
        <Motion kind="ember-drift" duration={1.1} mirror>
          <Dot x={258} y={148} r={3} color={YELLOW} />
        </Motion>
      </Motion>
      <Cup />
      <Motion kind="twinkle" phase={0.6}>
        <Spark x={128} y={150} r={9} rays={4} />
      </Motion>
    </>
  );
}

function Open() {
  return (
    <>
      <Motion kind="blow-body" pivot={FEET}>
        <Lobyare
          arms={RESTING_ARMS}
          face={
            <>
              <Motion kind="blow-eyes">
                <Motion kind="blink" phase={1.2}>
                  <Eye x={168} y={204} r={4.5} />
                  <Eye x={184} y={202} r={4.5} />
                </Motion>
              </Motion>
              <Motion kind="blow-mouth-rest">
                <Face>
                  <Line d="M172 218Q180 223 188 216" stroke={STROKE.fine} />
                </Face>
              </Motion>
              <Motion kind="blow-mouth-o">
                <Face>
                  <Line d="M185 217a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" stroke={STROKE.fine} />
                </Face>
              </Motion>
              <Motion kind="blow-breath">
                <Line d="M198 212L212 216M196 222L208 226" stroke={INK_FINE} />
              </Motion>
            </>
          }
        />
      </Motion>
      <Motion kind="blow-flame" pivot={FLAME_BASE}>
        <Flame size={0.7} flicker={1.6} />
      </Motion>
      <Motion kind="blow-ember" pivot={[250, 212]}>
        <Dot x={250} y={212} r={3} color={YELLOW} />
      </Motion>
      <Cup />
    </>
  );
}

function None() {
  return (
    <>
      <Motion kind="breathe" pivot={FEET} duration={2.4}>
        <Lobyare
          arms={RESTING_ARMS}
          face={
            <>
              <Motion kind="blink" phase={2}>
                <Eye x={170} y={206} r={4.5} />
                <Eye x={186} y={204} r={4.5} />
              </Motion>
              <Face>
                <Line d="M174 220Q181 225 188 219" stroke={STROKE.fine} />
              </Face>
            </>
          }
        />
      </Motion>
      <Motion kind="smoke-curl" pivot={[250, 240]}>
        <Line d="M250 240Q242 230 250 220Q258 210 250 200" stroke={INK_FINE} />
      </Motion>
      <Motion kind="smoke-curl" pivot={[250, 240]} phase={2} mirror>
        <Line d="M250 240Q258 230 250 220Q242 210 250 200" stroke={INK_FINE} />
      </Motion>
      <Cup />
    </>
  );
}
