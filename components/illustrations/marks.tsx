import { wave } from "./geometry";
import { INK } from "./palette";
import { Line, STROKE } from "./shape";

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** A burst of short rays. */
export function Spark({
  x,
  y,
  r = 22,
  rays = 5,
  rotate = 0,
}: {
  x: number;
  y: number;
  r?: number;
  rays?: number;
  rotate?: number;
}) {
  return (
    <g>
      {Array.from({ length: rays }, (_, i) => {
        const a = toRad(rotate + (360 / rays) * i);
        const inner = r * 0.45;
        return (
          <Line
            key={i}
            d={`M${x + Math.cos(a) * inner} ${y + Math.sin(a) * inner}L${x + Math.cos(a) * r} ${y + Math.sin(a) * r}`}
            stroke={STROKE.regular}
          />
        );
      })}
    </g>
  );
}

/** A loose decorative squiggle. */
export function Squiggle({
  x,
  y,
  width,
  amp = 7,
  rotate = 0,
  seed = 1,
  color = INK,
}: {
  x: number;
  y: number;
  width: number;
  amp?: number;
  rotate?: number;
  seed?: number;
  color?: string;
}) {
  return (
    <g transform={`rotate(${rotate} ${x} ${y})`}>
      <Line
        d={wave(x, y, width, { amp, period: 26, seed })}
        stroke={STROKE.regular}
        color={color}
      />
    </g>
  );
}

/** A path drawn as a trail of dots, for motion and flight paths. `moving` sends the dots along it. */
export function DottedPath({ d, moving = false }: { d: string; moving?: boolean }) {
  return (
    <path
      d={d}
      className={moving ? "ill-march" : undefined}
      style={{ fill: "none", stroke: INK, strokeWidth: 5, strokeDasharray: "0 14" }}
    />
  );
}

/** Parallel speed lines pointing along `angle` degrees. */
export function Dashes({
  x,
  y,
  angle = 0,
  count = 3,
  length = 20,
  gap = 11,
}: {
  x: number;
  y: number;
  angle?: number;
  count?: number;
  length?: number;
  gap?: number;
}) {
  const a = toRad(angle);
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const shift = (i - (count - 1) / 2) * gap;
        const len = length * (i % 2 ? 0.7 : 1);
        const sx = x - dy * shift;
        const sy = y + dx * shift;
        return (
          <Line
            key={i}
            d={`M${sx} ${sy}L${sx + dx * len} ${sy + dy * len}`}
            stroke={STROKE.regular}
          />
        );
      })}
    </g>
  );
}

/** Wavy lines that read as handwriting without being text. */
export function ScribbleLines({
  x,
  y,
  width,
  lines = 3,
  gap = 16,
  seed = 1,
}: {
  x: number;
  y: number;
  width: number;
  lines?: number;
  gap?: number;
  seed?: number;
}) {
  return (
    <g>
      {Array.from({ length: lines }, (_, i) => (
        <Line
          key={i}
          d={wave(x, y + i * gap, i === lines - 1 ? width * 0.6 : width, {
            amp: 2.5,
            period: 14,
            seed: seed + i,
          })}
          stroke={STROKE.fine}
        />
      ))}
    </g>
  );
}

export function Eye({ x, y, r = 5.5 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} style={{ fill: INK }} />;
}

/** A small round dot or ring of colour. */
export function Dot({
  x,
  y,
  r = 6,
  color = INK,
  ring = false,
}: {
  x: number;
  y: number;
  r?: number;
  color?: string;
  ring?: boolean;
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      style={ring ? { fill: "none", stroke: color, strokeWidth: STROKE.regular } : { fill: color }}
    />
  );
}

/** A short coloured confetti stroke. */
export function Fleck({
  x,
  y,
  angle = 0,
  length = 16,
  color,
}: {
  x: number;
  y: number;
  angle?: number;
  length?: number;
  color: string;
}) {
  const a = toRad(angle);
  return (
    <Line
      d={`M${x} ${y}L${x + Math.cos(a) * length} ${y + Math.sin(a) * length}`}
      stroke={STROKE.bold}
      color={color}
    />
  );
}
