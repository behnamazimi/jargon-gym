import { LOBYA_MARK } from "@/components/illustrations/scenes/lobya-mark";

export const APPLE_ICON_SIZE = 180;

// Light-theme values of the illustration colours (illustrations.css): these
// images are drawn on the server, where the CSS variables don't exist.
const INK = "#2a211b";
const PAPER = "#fdfcf9";
const GREEN = "#6ac48c";
/** The brand green at 15% on paper, the tile the in-app icon sits on (BrandIcon). */
const TILE = "#e4f2e8";

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
  const eyes = LOBYA_MARK.eyes
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${LOBYA_MARK.eyeRadius}" fill="${INK}"/>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
<defs><clipPath id="t"><rect width="140" height="140" rx="${radius}"/></clipPath>
<filter id="w" filterUnits="userSpaceOnUse" x="-24" y="-24" width="188" height="188" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7"/>
<feDisplacementMap in="SourceGraphic" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter></defs>
<g clip-path="url(#t)"><rect width="140" height="140" fill="${TILE}"/>
<g transform="${transform}"><g filter="url(#w)" stroke-linecap="round" stroke-linejoin="round">
<path d="${LOBYA_MARK.body}" fill="${PAPER}"/>
<path d="${LOBYA_MARK.body}" transform="translate(6 5)" fill="${GREEN}"/>
<path d="${LOBYA_MARK.body}" fill="none" stroke="${INK}" stroke-width="6"/>
${eyes}
<path d="${LOBYA_MARK.smile}" fill="none" stroke="${INK}" stroke-width="4.5"/>
</g></g></g></svg>`;
}

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
  const src = `data:image/svg+xml;base64,${Buffer.from(brandMarkSvg({ maskable, rounded })).toString("base64")}`;
  // ImageResponse renders a plain img; next/image doesn't apply there.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt="" />;
}
