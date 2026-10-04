import { blob, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Eye } from "../marks";
import { Motion } from "../motion";
import { Line, Shape, STROKE } from "../shape";

const SHOULDER = [146, 140] as const;

/** One lobya on its own, waving hello. `phase` keeps a row of them from waving in step. */
export function LobyaPortrait({
  color,
  seed,
  phase = 0,
  className,
}: {
  color: string;
  seed: number;
  phase?: number;
  className?: string;
}) {
  return (
    <Illustration viewBox="0 0 200 240" className={className}>
      <Line d={wave(30, 228, 140, { amp: 2, period: 36, seed })} stroke={STROKE.regular} />
      <Line d="M84 206L80 226M116 206L120 226" />
      <Shape d={blob({ cx: 100, cy: 150, rx: 48, ry: 66, taper: 0.1, seed })} color={color} />
      <Motion kind="blink" phase={phase + 0.8}>
        <Eye x={90} y={124} />
        <Eye x={110} y={122} />
      </Motion>
      <Line d="M90 142Q100 150 110 142" stroke={STROKE.regular} />
      <Line d="M54 156Q42 176 48 196" />
      <Motion kind="wave-search" pivot={SHOULDER} phase={phase}>
        <Line d={`M${SHOULDER[0]} ${SHOULDER[1]}Q164 120 170 98`} />
        <Shape
          d={blob({ cx: 172, cy: 92, rx: 9, seed: seed + 1 })}
          color={color}
          stroke={STROKE.regular}
        />
      </Motion>
    </Illustration>
  );
}
