import { INK } from "./palette";

export type SketchIds = { wobble: string; hatch: string; crosshatch: string };

// Room around the drawing for lines the wobble pushes past the edge.
const BLEED = 24;

export function SketchDefs({ ids, viewBox }: { ids: SketchIds; viewBox: string }) {
  const [x, y, width, height] = viewBox.split(/\s+/).map(Number);
  return (
    <defs>
      {/* Jitters every line a little so nothing looks ruler-straight. */}
      <filter
        id={ids.wobble}
        filterUnits="userSpaceOnUse"
        x={x - BLEED}
        y={y - BLEED}
        width={width + BLEED * 2}
        height={height + BLEED * 2}
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <pattern
        id={ids.hatch}
        width="9"
        height="9"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(40)"
      >
        <line x1="2" y1="0" x2="2" y2="9" style={{ stroke: INK, strokeWidth: 2.5 }} />
      </pattern>
      <pattern
        id={ids.crosshatch}
        width="10"
        height="10"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(40)"
      >
        <line x1="2" y1="0" x2="2" y2="10" style={{ stroke: INK, strokeWidth: 2 }} />
        <line x1="0" y1="2" x2="10" y2="2" style={{ stroke: INK, strokeWidth: 2 }} />
      </pattern>
    </defs>
  );
}
