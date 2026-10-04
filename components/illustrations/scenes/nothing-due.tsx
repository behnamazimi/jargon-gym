import { blob, box, curve, quad, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, Eye, Spark, Squiggle } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

const GRID_ROWS = [218, 256, 294];
const GRID_COLS = [555, 600, 645];

/** Nothing to fall behind on: leaning back in a deck chair while the calendar turns to another empty page. */
export function NothingDueScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Sun />
      <Squiggle x={380} y={150} width={64} rotate={-6} seed={7} />
      <Dot x={460} y={250} r={7} color={PURPLE} ring />
      <Dot x={90} y={360} r={6} color={CORAL} />
      <Dot x={730} y={420} r={7} color={YELLOW} />

      <Line d={wave(90, 526, 620, { amp: 2, period: 46, seed: 3 })} stroke={STROKE.regular} />

      <Calendar />
      <SideTable />
      <Lounger />
    </Illustration>
  );
}

function Sun() {
  return (
    <g>
      <Motion kind="twinkle" duration={4}>
        <Spark x={150} y={150} r={56} rays={8} />
      </Motion>
      <Shape d={blob({ cx: 150, cy: 150, rx: 24, seed: 2, wobble: 0.03 })} color={YELLOW} />
    </g>
  );
}

function CalendarPage() {
  return (
    <g>
      <Shape d={box(512, 176, 176, 156, { seed: 4, bow: 2 })} />
      {GRID_ROWS.map((y) => (
        <Line key={y} d={`M522 ${y}L678 ${y}`} stroke={STROKE.fine} />
      ))}
      {GRID_COLS.map((x) => (
        <Line key={x} d={`M${x} 186L${x} 322`} stroke={STROKE.fine} />
      ))}
    </g>
  );
}

function Calendar() {
  return (
    <g>
      <Line d="M558 140L600 106L642 140" stroke={STROKE.regular} />
      <Dot x={600} y={104} r={6} />
      <CalendarPage />
      <Hatch d={blob({ cx: 664, cy: 310, rx: 14, ry: 9, seed: 5 })} />
      {/* Every so often a page turns over, and the next one is just as empty. */}
      <Motion kind="calm-flip" origin="50% 0%">
        <CalendarPage />
      </Motion>
      <Shape d={box(512, 140, 176, 38, { seed: 6, bow: 1 })} color={PURPLE} />
      <Line d="M552 130L552 152M648 130L648 152" />
    </g>
  );
}

function SideTable() {
  return (
    <g>
      <Line d="M476 458L476 526M456 526L496 526" />
      <Shape d={box(440, 446, 72, 14, { seed: 7, bow: 1 })} color={YELLOW} />
      <Motion kind="steam">
        <Line d="M468 410Q462 404 468 398Q474 392 468 386" stroke={STROKE.fine} />
      </Motion>
      <Motion kind="steam" phase={0.9}>
        <Line d="M480 408Q474 402 480 396Q486 390 480 384" stroke={STROKE.fine} />
      </Motion>
      <Line d="M488 424C500 424 500 440 488 440" stroke={STROKE.regular} />
      <Shape d={box(462, 416, 28, 30, { seed: 8, bow: 1 })} color={CORAL} stroke={STROKE.regular} />
    </g>
  );
}

function Lounger() {
  return (
    <g>
      {/* The deck chair. */}
      <Line d="M290 470L264 526M404 478L420 526M228 254L340 526" />
      <Shape
        d={quad(
          [
            [204, 254],
            [250, 242],
            [322, 458],
            [284, 472],
          ],
          { seed: 9, bow: 2 },
        )}
        color={BLUE}
      />
      <Hatch d={blob({ cx: 236, cy: 300, rx: 10, ry: 18, seed: 10 })} />
      <Shape
        d={quad(
          [
            [284, 472],
            [322, 458],
            [414, 464],
            [406, 482],
          ],
          { seed: 11, bow: 1 },
        )}
        color={BLUE}
      />

      {/* Leaning back, hands behind the head, legs crossed. */}
      <Line
        d={curve([
          [322, 462],
          [366, 450],
          [404, 460],
        ])}
      />
      <Line
        d={curve([
          [330, 470],
          [372, 468],
          [408, 450],
        ])}
      />
      <Motion kind="breathe" origin="50% 100%" duration={3}>
        <Line
          d={curve([
            [262, 384],
            [230, 352],
            [264, 322],
          ])}
        />
        <Line
          d={curve([
            [336, 376],
            [358, 336],
            [318, 316],
          ])}
        />
        <Shape
          d={blob({ cx: 300, cy: 394, rx: 54, ry: 80, taper: 0.1, rotate: -20, seed: 12 })}
          color={CORAL}
        />
        <Motion kind="blink" phase={2.6}>
          <Motion kind="calm-glance">
            <Eye x={298} y={352} />
            <Eye x={320} y={352} />
          </Motion>
        </Motion>
        <Line d="M300 372Q312 381 325 370" stroke={STROKE.regular} />
      </Motion>
    </g>
  );
}
