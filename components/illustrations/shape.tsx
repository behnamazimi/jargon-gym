import { INK, PAPER } from "./palette";

export const STROKE = { bold: 6, regular: 4.5, fine: 3 } as const;

// How far colour fills land from their outlines, like a misregistered riso print.
const MISREGISTER: readonly [number, number] = [6, 5];

type ShapeProps = {
  d: string;
  /** Flat colour, printed slightly off the outline. */
  color?: string;
  /** Paint paper under the shape so whatever is behind it doesn't show through. */
  opaque?: boolean;
  offset?: readonly [number, number];
  stroke?: number;
};

/** A closed outlined shape: the basic building block of every scene. */
export function Shape({
  d,
  color,
  opaque = true,
  offset = MISREGISTER,
  stroke = STROKE.bold,
}: ShapeProps) {
  return (
    <g>
      {opaque ? <path d={d} style={{ fill: PAPER }} /> : null}
      {color ? (
        <path d={d} transform={`translate(${offset[0]} ${offset[1]})`} style={{ fill: color }} />
      ) : null}
      <path d={d} style={{ fill: "none", stroke: INK, strokeWidth: stroke }} />
    </g>
  );
}

/** An open ink stroke: limbs, rails, handles. */
export function Line({
  d,
  stroke = STROKE.bold,
  color = INK,
}: {
  d: string;
  stroke?: number;
  color?: string;
}) {
  return <path d={d} style={{ fill: "none", stroke: color, strokeWidth: stroke }} />;
}

/** A patch of hatching for texture. Draw it inside a shape, after its fill. */
export function Hatch({ d, cross = false }: { d: string; cross?: boolean }) {
  return (
    <path d={d} style={{ fill: cross ? "var(--ill-crosshatch-fill)" : "var(--ill-hatch-fill)" }} />
  );
}
