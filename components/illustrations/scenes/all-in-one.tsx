import { blob, box, curve, polyline, quad, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, ScribbleLines, Spark, Squiggle } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

/** Everything in one place: Lobyaq reads, Lobyar listens and Lobyare quizzes, side by side on one big card. */
export function AllInOneScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Motion kind="twinkle">
        <Spark x={300} y={190} r={18} rotate={8} />
      </Motion>
      <Motion kind="twinkle" phase={1.3}>
        <Spark x={92} y={300} r={15} rotate={-12} />
      </Motion>
      <Squiggle x={460} y={150} width={66} rotate={-8} seed={4} />
      <Dot x={180} y={170} r={7} color={YELLOW} />
      <Dot x={720} y={160} r={8} color={CORAL} ring />
      <Dot x={740} y={330} r={6} color={BLUE} />

      {/* The one place they all share. */}
      <Shape
        d={quad(
          [
            [100, 454],
            [700, 454],
            [744, 524],
            [56, 524],
          ],
          { seed: 2, bow: 3 },
        )}
        color={YELLOW}
      />
      <Line d={wave(140, 474, 120, { amp: 2.5, period: 14, seed: 3 })} stroke={STROKE.fine} />
      <Hatch d={blob({ cx: 660, cy: 502, rx: 26, ry: 10, seed: 5 })} />

      <Reading />
      <Listening />
      <Quizzing />
    </Illustration>
  );
}

function Reading() {
  return (
    <g>
      <Line d="M184 462L180 490M216 462L220 490" />
      <Motion kind="breathe" origin="50% 100%" phase={0.4}>
        <Shape d={blob({ cx: 200, cy: 392, rx: 52, ry: 74, taper: 0.1, seed: 6 })} color={BLUE} />
        <Motion kind="blink" phase={1.1}>
          <Motion kind="scan" amount={6}>
            <Eye x={190} y={360} />
            <Eye x={212} y={360} />
          </Motion>
        </Motion>
      </Motion>
      {/* An open book held in front. */}
      <Shape
        d={polyline(
          [
            [146, 404],
            [200, 414],
            [254, 404],
            [254, 452],
            [200, 462],
            [146, 452],
          ],
          true,
        )}
        color={CORAL}
      />
      <Shape
        d={quad([
          [154, 400],
          [200, 410],
          [200, 452],
          [154, 444],
        ])}
        stroke={STROKE.regular}
      />
      <Shape
        d={quad([
          [200, 410],
          [246, 400],
          [246, 444],
          [200, 452],
        ])}
        stroke={STROKE.regular}
      />
      <ScribbleLines x={162} y={420} width={30} lines={2} gap={12} seed={7} />
      <ScribbleLines x={208} y={418} width={30} lines={2} gap={12} seed={8} />
      <Shape d={blob({ cx: 148, cy: 426, rx: 9, seed: 9 })} color={BLUE} stroke={STROKE.regular} />
      <Shape d={blob({ cx: 252, cy: 426, rx: 9, seed: 10 })} color={BLUE} stroke={STROKE.regular} />
    </g>
  );
}

// Sound arcs opening away from an ear: to the right from x, or to the left with dir -1.
function arcs(x: number, y: number, dir: 1 | -1) {
  return [0, 1]
    .map((i) => {
      const ax = x + dir * i * 11;
      const h = 9 + i * 7;
      return `M${ax} ${y - h}Q${ax + dir * (8 + i * 3)} ${y} ${ax} ${y + h}`;
    })
    .join("");
}

function Listening() {
  return (
    <g>
      <Motion kind="listen-arcs" origin="0% 50%">
        <Line d={arcs(468, 372, 1)} stroke={STROKE.regular} />
      </Motion>
      <Motion kind="listen-arcs" origin="100% 50%" phase={0.4}>
        <Line d={arcs(332, 372, -1)} stroke={STROKE.regular} />
      </Motion>
      <Line d="M384 462L380 490M416 462L420 490" />
      <Line d="M354 410Q336 436 350 456" />
      <Line d="M446 410Q464 436 450 456" />
      {/* Sways along to what it hears. */}
      <Motion kind="wiggle" origin="50% 100%" amount={3} duration={1.2}>
        <Shape d={blob({ cx: 400, cy: 392, rx: 52, ry: 74, taper: 0.1, seed: 11 })} color={CORAL} />
        <Hatch d={blob({ cx: 380, cy: 430, rx: 14, ry: 10, seed: 12 })} />
        <Motion kind="blink" phase={2.5}>
          <Eye x={390} y={360} />
          <Eye x={412} y={360} />
        </Motion>
        <Line d="M390 380Q401 388 413 379" stroke={STROKE.regular} />
        <Line
          d={curve([
            [350, 372],
            [358, 324],
            [402, 308],
            [444, 322],
            [450, 370],
          ])}
        />
        <Shape
          d={blob({ cx: 350, cy: 374, rx: 11, ry: 17, seed: 13 })}
          color={BLUE}
          stroke={STROKE.regular}
        />
        <Shape
          d={blob({ cx: 450, cy: 372, rx: 11, ry: 17, seed: 14 })}
          color={BLUE}
          stroke={STROKE.regular}
        />
      </Motion>
    </g>
  );
}

function Quizzing() {
  return (
    <g>
      {/* Reads the question, thinks, flips the card to a check mark, hops, flips it back. */}
      <Motion kind="cheer">
        <Line d="M584 462L580 490M616 462L620 490" />
        <Motion kind="cheer-arm" pivot={[552, 384]}>
          <Line
            d={curve([
              [552, 384],
              [530, 396],
              [516, 382],
            ])}
          />
        </Motion>
        <Line d="M644 368L668 340" />
        <Shape
          d={blob({ cx: 600, cy: 392, rx: 52, ry: 74, taper: 0.1, seed: 15 })}
          color={PURPLE}
        />
        <Motion kind="blink" phase={1.7}>
          <Motion kind="think">
            <Eye x={610} y={360} />
            <Eye x={631} y={358} />
          </Motion>
        </Motion>
        <Line d="M612 380Q623 388 634 378" stroke={STROKE.regular} />

        <Motion kind="flip-front">
          <Shape d={box(660, 286, 64, 46, { seed: 16, bow: 2 })} stroke={STROKE.regular} />
          <ScribbleLines x={671} y={300} width={42} lines={3} gap={10} seed={17} />
        </Motion>
        <Motion kind="flip-back">
          <Shape
            d={box(660, 286, 64, 46, { seed: 16, bow: 2 })}
            color={BLUE}
            stroke={STROKE.regular}
          />
          <Line d="M676 310L687 321L707 296" stroke={7} />
        </Motion>
        <Shape
          d={blob({ cx: 668, cy: 338, rx: 9, seed: 18 })}
          color={PURPLE}
          stroke={STROKE.regular}
        />
      </Motion>
      <Motion kind="cheer-flash">
        <Spark x={748} y={262} r={20} rotate={-20} />
      </Motion>
    </g>
  );
}
