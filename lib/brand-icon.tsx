import { LOBYA_MARK, WORDMARK } from "@/components/illustrations/scenes/lobya-mark";
import { WORDMARK_BYAS, WORDMARK_L } from "@/components/illustrations/scenes/wordmark-letters";

export const APPLE_ICON_SIZE = 180;

// Light-theme values of the illustration colours (illustrations.css): these
// images are drawn on the server, where the CSS variables don't exist.
const INK = "#2a211b";
const PAPER = "#fdfcf9";
const GREEN = "#6ac48c";
/** The brand green at 15% on paper, the tile the in-app icon sits on (BrandIcon). */
const TILE = "#e4f2e8";

/** The illustrations' marker jitter; `scale` is how far it pushes lines, in the drawing's units. */
const wobble = (id: string, scale: number) =>
  `<filter id="${id}" filterUnits="userSpaceOnUse" x="-400" y="-400" width="1200" height="1200" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7"/>
<feDisplacementMap in="SourceGraphic" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`;

/** The brand lobya itself (in LOBYA_MARK's coordinates), as SVG markup. */
function beanMarkup() {
  const eyes = LOBYA_MARK.eyes
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${LOBYA_MARK.eyeRadius}" fill="${INK}"/>`)
    .join("");
  return `<path d="${LOBYA_MARK.body}" fill="${PAPER}"/>
<path d="${LOBYA_MARK.body}" transform="translate(6 5)" fill="${GREEN}"/>
<path d="${LOBYA_MARK.body}" fill="none" stroke="${INK}" stroke-width="6"/>
${eyes}
<path d="${LOBYA_MARK.smile}" fill="none" stroke="${INK}" stroke-width="4.5"/>`;
}

/**
 * The brand lobya on its light green tile, as an SVG string. It traces the same
 * character as LobyaMarkScene, drawn too big for the tile so its bottom is
 * cropped off, like BrandIcon. `maskable` keeps the face inside the safe zone
 * Android crops icons to.
 */
function brandMarkSvg({ maskable, rounded }: { maskable: boolean; rounded: boolean }) {
  // The bean's box is LOBYA_MARK.viewBox (19 15 88 103); its top sits at `top` on a 140 tile.
  const scale = maskable ? 1.1 : 1.445;
  const top = maskable ? 43 : 36;
  const transform = `translate(${70 - 63 * scale} ${top - 15 * scale}) scale(${scale})`;
  const radius = rounded ? 30 : 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
<defs><clipPath id="t"><rect width="140" height="140" rx="${radius}"/></clipPath>${wobble("w", 5)}</defs>
<g clip-path="url(#t)"><rect width="140" height="140" fill="${TILE}"/>
<g transform="${transform}"><g filter="url(#w)" stroke-linecap="round" stroke-linejoin="round">
${beanMarkup()}
</g></g></g></svg>`;
}

/** The "lobyas" wordmark, laid out like Wordmark, as an SVG string. */
function wordmarkSvg() {
  const scale = WORDMARK.bean.width / 88;
  const bean = `translate(${WORDMARK.bean.x - 19 * scale} ${WORDMARK.bean.top - 15 * scale}) scale(${scale})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${WORDMARK.viewBox}">
<defs>${wobble("w", 2.8)}</defs>
<g filter="url(#w)" stroke-linecap="round" stroke-linejoin="round">
<path d="${WORDMARK_L}" fill="${INK}"/>
<g transform="${bean}">${beanMarkup()}</g>
<path d="${WORDMARK_BYAS}" transform="translate(${WORDMARK.byasX} 0)" fill="${INK}"/>
</g></svg>`;
}

const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** The brand icon as an image, for app icons and share images drawn with ImageResponse. */
export function BrandMarkImage({
  size,
  maskable = false,
  rounded = true,
}: {
  size: number;
  maskable?: boolean;
  rounded?: boolean;
}) {
  // ImageResponse renders a plain img; next/image doesn't apply there.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img src={dataUri(brandMarkSvg({ maskable, rounded }))} width={size} height={size} alt="" />
  );
}

/** A home-screen splash: the app icon with the wordmark below it, centred on paper. */
export function BrandSplash({ width, height }: { width: number; height: number }) {
  const icon = Math.round(Math.min(width, height) * 0.24);
  const [, , boxWidth, boxHeight] = WORDMARK.viewBox.split(" ").map(Number);
  const wordWidth = Math.round(icon * 1.5);
  const wordHeight = Math.round((wordWidth * boxHeight) / boxWidth);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.round(icon * 0.2),
        background: PAPER,
      }}
    >
      <BrandMarkImage size={icon} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUri(wordmarkSvg())} width={wordWidth} height={wordHeight} alt="" />
    </div>
  );
}
