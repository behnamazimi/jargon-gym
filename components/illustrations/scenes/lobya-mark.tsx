import { useId } from "react";
import { cn } from "@/lib/utils";
import { blob } from "../geometry";
import { Illustration } from "../illustration";
import { Eye } from "../marks";
import { INK } from "../palette";
import { Line, Shape, STROKE } from "../shape";

/**
 * The brand lobya: the bean that is the o in the wordmark and the app's icon.
 * Plain data, so the server-drawn app icons (lib/brand-icon.tsx) trace the same
 * character.
 */
export const LOBYA_MARK = {
  /** Hugs the bean, its offset fill and its outline. */
  viewBox: "19 15 88 103",
  body: blob({ cx: 60, cy: 64, rx: 38, ry: 46, taper: 0.1, seed: 3 }),
  eyes: [
    [48, 56],
    [68, 53],
  ],
  eyeRadius: 6,
  smile: "M46 74Q58 84 70 72",
} as const;

/** Green at rest; `ill-mark-drift` on the svg moves it through the other lobyas' colours. */
const MARK_COLOR = "var(--ill-mark, var(--ill-green))";

function MarkParts() {
  return (
    <>
      <Shape d={LOBYA_MARK.body} color={MARK_COLOR} />
      {LOBYA_MARK.eyes.map(([x, y]) => (
        <Eye key={x} x={x} y={y} r={LOBYA_MARK.eyeRadius} />
      ))}
      <Line d={LOBYA_MARK.smile} stroke={STROKE.regular} />
    </>
  );
}

/** The brand lobya on its own, for small spots: the header, the phone bar, the footer. */
export function LobyaMarkScene({ className }: { className?: string }) {
  return (
    <Illustration viewBox={LOBYA_MARK.viewBox} className={cn("ill-mark ill-mark-drift", className)}>
      <MarkParts />
    </Illustration>
  );
}

// The wordmark is laid out in units of its font size (100). The bean takes the
// o's place at 1.55 times the x-height, a little closer to the l than an o sits.
const BEAN = { x: 25.3, top: -66.1, width: 58.2 };
const BEAN_SCALE = BEAN.width / 88;
const BYAS_X = 83.6;

/**
 * "lobyas" in Fraunces (soft and wonky) with the brand lobya as its o, for big
 * screens. The text stays live type, so it needs the WONK axis loaded.
 */
export function Wordmark({ className }: { className?: string }) {
  const filter = `ill-${useId().replace(/[^\w-]/g, "")}-wordmark`;
  const text = {
    fill: INK,
    fontFamily: "var(--font-fraunces)",
    fontSize: 100,
    fontWeight: 520,
    fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144',
    letterSpacing: "-0.012em",
  };

  return (
    <svg viewBox="-4 -82 271 112" className={className} aria-hidden="true" focusable="false">
      <defs>
        {/* The illustrations' marker jitter, tuned for type this size. */}
        <filter
          id={filter}
          filterUnits="userSpaceOnUse"
          x="-24"
          y="-106"
          width="316"
          height="160"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" />
          <feDisplacementMap
            in="SourceGraphic"
            scale="2.8"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <g filter={`url(#${filter})`} strokeLinecap="round" strokeLinejoin="round">
        <text x="0" y="0" style={text}>
          l
        </text>
        <g
          className="ill-mark ill-mark-drift"
          transform={`translate(${BEAN.x - 19 * BEAN_SCALE} ${BEAN.top - 15 * BEAN_SCALE}) scale(${BEAN_SCALE})`}
        >
          <MarkParts />
        </g>
        <text x={BYAS_X} y="0" style={text}>
          byas
        </text>
      </g>
    </svg>
  );
}
