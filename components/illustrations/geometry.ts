// Path builders for hand-drawn shapes. Everything is seeded, so the same
// input always draws the same wobble on the server and the client.

export type Point = readonly [number, number];

const fmt = ([x, y]: Point) => `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;

function random(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function through(points: readonly Point[], closed: boolean) {
  const n = points.length;
  const at = (i: number) =>
    closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))];
  let d = `M${fmt(points[0])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`;
  }
  return closed ? `${d}Z` : d;
}

/** A smooth open line through the points. */
export const curve = (points: readonly Point[]) => through(points, false);

/** A smooth closed shape through the points. */
const loop = (points: readonly Point[]) => through(points, true);

/** A straight-segment path through the points. */
export const polyline = (points: readonly Point[], closed = false) =>
  `M${points.map(fmt).join("L")}${closed ? "Z" : ""}`;

type BlobOptions = {
  cx: number;
  cy: number;
  rx: number;
  ry?: number;
  seed?: number;
  /** How far each point may stray from the ellipse, as a share of the radius. */
  wobble?: number;
  /** Widens the bottom and narrows the top (negative flips it), for pear-shaped bodies. */
  taper?: number;
  rotate?: number;
  points?: number;
};

/** A lumpy ellipse: bodies, heads, clouds. */
export function blob({
  cx,
  cy,
  rx,
  ry = rx,
  seed = 1,
  wobble = 0.05,
  taper = 0,
  rotate = 0,
  points = 10,
}: BlobOptions) {
  const rand = random(seed);
  const turn = (rotate * Math.PI) / 180;
  const pts: Point[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const k = 1 + (rand() * 2 - 1) * wobble;
    const x = Math.cos(a) * rx * k * (1 + taper * Math.sin(a));
    const y = Math.sin(a) * ry * k;
    pts.push([
      cx + x * Math.cos(turn) - y * Math.sin(turn),
      cy + x * Math.sin(turn) + y * Math.cos(turn),
    ]);
  }
  return loop(pts);
}

type QuadOptions = { seed?: number; bow?: number };

/** A four-cornered shape whose edges bow slightly, like a card drawn freehand. */
export function quad(
  corners: readonly [Point, Point, Point, Point],
  { seed = 1, bow = 3 }: QuadOptions = {},
) {
  const rand = random(seed);
  let d = `M${fmt(corners[0])}`;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = corners[i];
    const [bx, by] = corners[(i + 1) % 4];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const k = (rand() * 2 - 1) * bow;
    const control: Point = [
      (ax + bx) / 2 - ((by - ay) / len) * k,
      (ay + by) / 2 + ((bx - ax) / len) * k,
    ];
    d += `Q${fmt(control)} ${fmt(corners[(i + 1) % 4])}`;
  }
  return `${d}Z`;
}

/** An upright freehand rectangle. Rotate the surrounding group to tilt it. */
export const box = (x: number, y: number, w: number, h: number, options?: QuadOptions) =>
  quad(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    options,
  );

type WaveOptions = { amp?: number; period?: number; seed?: number };

/** A horizontal squiggle starting at (x, y). */
export function wave(
  x: number,
  y: number,
  width: number,
  { amp = 4, period = 22, seed = 1 }: WaveOptions = {},
) {
  const rand = random(seed);
  const step = period / 2;
  const pts: Point[] = [];
  for (let i = 0, dx = 0; dx <= width; i++, dx += step) {
    const jitter = 0.6 + rand() * 0.6;
    pts.push([x + dx, y + (i === 0 ? 0 : (i % 2 ? -amp : amp) * jitter)]);
  }
  return curve(pts);
}
