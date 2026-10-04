import { blob, box, curve, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, DottedPath, Eye, Spark, Squiggle } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

// Sound arcs: opening to the right from x, or to the left with dir -1.
function arcs(x: number, y: number, dir: 1 | -1) {
  return [0, 1, 2]
    .map((i) => {
      const ax = x + dir * i * 10;
      const h = 10 + i * 6;
      return `M${ax} ${y - h}Q${ax + dir * (8 + i * 3)} ${y} ${ax} ${y + h}`;
    })
    .join("");
}

/** Shadowing, call and response: one listens as the lit sentence plays, the other says it back in the gap. */
export function ShadowingScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Motion kind="twinkle">
        <Spark x={96} y={190} r={18} rotate={6} />
      </Motion>
      <Squiggle x={660} y={290} width={70} rotate={10} seed={6} />
      <Dot x={720} y={120} r={7} color={CORAL} />
      <Dot x={400} y={300} r={7} color={BLUE} ring />

      <Line d={wave(120, 538, 560, { amp: 2, period: 44, seed: 3 })} stroke={STROKE.regular} />

      {/* The story text. The sentence being read lights up as it plays. */}
      <Shape d={box(180, 96, 440, 130, { seed: 4 })} />
      <Hatch d={blob({ cx: 588, cy: 200, rx: 18, ry: 12, seed: 5 })} />
      <Line d={wave(204, 140, 104, { amp: 2.5, period: 14, seed: 6 })} stroke={STROKE.fine} />
      <Motion kind="hear-play" origin="0% 50%">
        <Line d="M328 140L468 140" stroke={28} color={YELLOW} />
      </Motion>
      <Line d={wave(332, 140, 130, { amp: 3, period: 22, seed: 7 })} stroke={6} />
      <Line d={wave(486, 140, 110, { amp: 2.5, period: 14, seed: 8 })} stroke={STROKE.fine} />
      <Line d={wave(204, 184, 180, { amp: 2.5, period: 14, seed: 9 })} stroke={STROKE.fine} />
      <Line d={wave(402, 184, 150, { amp: 2.5, period: 14, seed: 10 })} stroke={STROKE.fine} />

      <DottedPath
        moving
        d={curve([
          [250, 232],
          [214, 290],
          [168, 380],
        ])}
      />

      <Listener />
      <Repeater />
    </Illustration>
  );
}

function Listener() {
  return (
    <Motion kind="hear-listen" origin="50% 100%">
      <Motion kind="hear-sound" origin="100% 50%">
        <Line d={arcs(140, 428, -1)} stroke={STROKE.regular} />
      </Motion>
      <Line d="M200 518L194 536M240 518L246 536" />
      <Line d="M172 474Q154 500 168 518" />
      <Line d="M268 474Q286 500 272 518" />
      <Shape d={blob({ cx: 220, cy: 446, rx: 58, ry: 80, taper: 0.1, seed: 11 })} color={BLUE} />
      <Hatch d={blob({ cx: 196, cy: 486, rx: 16, ry: 11, seed: 12 })} />
      <Motion kind="blink" phase={2.4}>
        <Motion kind="hear-glance">
          <Eye x={220} y={420} />
          <Eye x={242} y={418} />
        </Motion>
      </Motion>
      <Line d="M222 440Q232 447 244 438" stroke={STROKE.regular} />

      <Line
        d={curve([
          [164, 424],
          [172, 372],
          [222, 352],
          [270, 368],
          [276, 420],
        ])}
      />
      <Shape
        d={blob({ cx: 164, cy: 428, rx: 12, ry: 18, seed: 13 })}
        color={CORAL}
        stroke={STROKE.regular}
      />
      <Shape
        d={blob({ cx: 276, cy: 424, rx: 12, ry: 18, seed: 14 })}
        color={CORAL}
        stroke={STROKE.regular}
      />
    </Motion>
  );
}

function Repeater() {
  return (
    <g>
      <Motion kind="hear-echo" origin="100% 50%">
        <Line d={arcs(508, 442, -1)} stroke={STROKE.regular} />
      </Motion>
      <Motion kind="hear-speak" origin="50% 100%">
        <Line d="M560 518L554 536M600 518L606 536" />
        <Line d="M532 474Q514 500 528 518" />
        <Line d="M628 474Q646 500 632 518" />
        <Shape
          d={blob({ cx: 580, cy: 446, rx: 58, ry: 80, taper: 0.1, seed: 15 })}
          color={PURPLE}
        />
        <Hatch d={blob({ cx: 608, cy: 486, rx: 16, ry: 11, seed: 16 })} />
        <Motion kind="blink" phase={0.7}>
          <Eye x={544} y={420} />
          <Eye x={566} y={418} />
        </Motion>
        <Motion kind="hear-mouth-shut">
          <Line d="M542 442Q552 448 564 441" stroke={STROKE.regular} />
        </Motion>
        <Motion kind="hear-mouth-open">
          <Shape d={blob({ cx: 552, cy: 444, rx: 9, ry: 8, seed: 17 })} stroke={STROKE.regular} />
        </Motion>
      </Motion>
    </g>
  );
}
