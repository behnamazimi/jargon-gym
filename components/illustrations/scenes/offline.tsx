import { blob, box, curve, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, Squiggle } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

// Wi-Fi arcs above the phone, smallest first.
const SIGNAL = [
  { r: 16, kind: "signal-1" },
  { r: 32, kind: "signal-2" },
  { r: 48, kind: "signal-3" },
] as const;
const SIGNAL_CENTER = { x: 448, y: 190 };

function arc(r: number) {
  const { x, y } = SIGNAL_CENTER;
  const dx = r * Math.cos(Math.PI / 4);
  return `M${x - dx} ${y - dx}A${r} ${r} 0 0 1 ${x + dx} ${y - dx}`;
}

/**
 * For being offline: someone on tiptoe on a stack of cards holds their phone
 * up and waves it around for a signal. The bars light up one by one, then
 * fade again, and they sink back with a sigh.
 */
export function OfflineScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Squiggle x={150} y={200} width={70} rotate={-8} seed={4} />
      <Dot x={620} y={240} r={8} color={PURPLE} ring />
      <Dot x={200} y={330} r={6} color={CORAL} />
      <Line d={wave(220, 524, 360, { amp: 2, period: 44, seed: 6 })} stroke={STROKE.regular} />

      <Shape d={box(300, 488, 168, 34, { seed: 1, bow: 2 })} color={BLUE} />
      <Shape d={box(310, 456, 152, 32, { seed: 2, bow: 2 })} />
      <Shape d={box(296, 424, 170, 32, { seed: 3, bow: 2 })} color={YELLOW} />

      <Motion kind="reach" origin="50% 100%">
        {/* Phone held up high, waved around to catch a signal. */}
        <Motion kind="wave-search" pivot={[410, 326]}>
          <Line
            d={curve([
              [410, 326],
              [430, 290],
              [440, 250],
            ])}
          />
          <g transform="rotate(8 446 226)">
            <Shape
              d={box(428, 196, 36, 60, { seed: 4, bow: 2 })}
              color={CORAL}
              stroke={STROKE.regular}
            />
            <Shape d={box(434, 206, 24, 40, { seed: 5, bow: 1 })} stroke={STROKE.fine} />
          </g>
          <Dot x={SIGNAL_CENTER.x} y={SIGNAL_CENTER.y} r={5} />
          {SIGNAL.map(({ r, kind }) => (
            <Motion key={r} kind={kind}>
              <Line d={arc(r)} stroke={STROKE.regular} />
            </Motion>
          ))}
        </Motion>

        <Line d="M366 412L362 424M394 412L398 424" />
        <Line
          d={curve([
            [352, 340],
            [326, 330],
            [306, 340],
          ])}
        />
        <Shape
          d={blob({ cx: 380, cy: 352, rx: 44, ry: 66, taper: 0.12, seed: 7 })}
          color={PURPLE}
        />
        <Hatch d={blob({ cx: 362, cy: 394, rx: 13, ry: 10, seed: 2 })} />
        <Motion kind="blink" phase={1.4}>
          <Eye x={388} y={312} />
          <Eye x={408} y={308} />
        </Motion>
        <Line d="M390 336Q398 332 408 336" stroke={STROKE.regular} />
      </Motion>
    </Illustration>
  );
}
