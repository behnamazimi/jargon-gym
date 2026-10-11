import { useId } from "react";
import { cn } from "@/lib/utils";
import { blob } from "../geometry";
import { Illustration } from "../illustration";
import { Eye } from "../marks";
import { Motion } from "../motion";
import { INK } from "../palette";
import { Line, Shape, STROKE } from "../shape";
import { WORDMARK_BYAS, WORDMARK_L } from "./wordmark-letters";

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

function MarkParts() {
  return (
    <>
      {/* Green at rest; inside `ill-mark-drift` it moves through the other lobyas' colours. */}
      <Shape d={LOBYA_MARK.body} color="var(--ill-green)" colorClassName="ill-mark-fill" />
      <Motion kind="blink">
        {LOBYA_MARK.eyes.map(([x, y]) => (
          <Eye key={x} x={x} y={y} r={LOBYA_MARK.eyeRadius} />
        ))}
      </Motion>
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

/**
 * The wordmark's layout, in units of its font size (100) with the baseline at
 * 0. The bean takes the o's place at 1.55 times the x-height, a little closer
 * to the l than an o sits. Shared with the server-drawn splash images.
 */
export const WORDMARK = {
  viewBox: "-4 -82 271 112",
  bean: { x: 25.3, top: -66.1, width: 58.2 },
  byasX: 83.6,
} as const;

const BEAN_SCALE = WORDMARK.bean.width / 88;

/** "lobyas" in the soft Fraunces letters with the brand lobya as its o, for big screens. */
export function Wordmark({ className }: { className?: string }) {
  const filter = `ill-${useId().replace(/[^\w-]/g, "")}-wordmark`;

  return (
    <svg viewBox={WORDMARK.viewBox} className={className} aria-hidden="true" focusable="false">
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
        <path d={WORDMARK_L} style={{ fill: INK }} />
        <g
          className="ill-mark ill-mark-drift"
          transform={`translate(${WORDMARK.bean.x - 19 * BEAN_SCALE} ${WORDMARK.bean.top - 15 * BEAN_SCALE}) scale(${BEAN_SCALE})`}
        >
          <MarkParts />
        </g>
        <path
          d={WORDMARK_BYAS}
          transform={`translate(${WORDMARK.byasX} 0)`}
          style={{ fill: INK }}
        />
      </g>
    </svg>
  );
}
