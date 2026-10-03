import { blob, box, curve, quad, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, DottedPath, Eye, ScribbleLines, Spark, Squiggle } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

/**
 * One queue on every device. Someone taps through a card on their phone, and the
 * laptop, the desktop widget and the Telegram chat all flip to the same next card
 * at the same moment.
 */
export function EverywhereScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Squiggle x={60} y={470} width={60} rotate={8} seed={3} />
      <Dot x={740} y={300} r={8} color={PURPLE} ring />
      <Dot x={90} y={330} r={6} color={CORAL} />

      {/* Sync lines carrying the phone's progress out to the other devices. */}
      <DottedPath
        moving
        d={curve([
          [392, 372],
          [330, 290],
          [232, 238],
        ])}
      />
      <DottedPath
        moving
        d={curve([
          [412, 372],
          [500, 270],
          [600, 214],
        ])}
      />
      <DottedPath
        moving
        d={curve([
          [424, 392],
          [480, 380],
          [540, 372],
        ])}
      />

      <ChatBubble />
      <Widget />
      <Laptop />
      <Person />
    </Illustration>
  );
}

/**
 * The card every device shows. All copies flip together, so the queue reads as one.
 * Faces alternate between two colours so each flip looks like the next card.
 */
function QueueCard({ x, y, w }: { x: number; y: number; w: number }) {
  const h = w * 0.64;
  const lines = (
    <ScribbleLines x={x + w * 0.18} y={y + h * 0.36} width={w * 0.64} lines={2} gap={h * 0.3} />
  );
  return (
    <g>
      <Motion kind="flip-front">
        <Shape
          d={box(x, y, w, h, { bow: 1 })}
          color={YELLOW}
          stroke={STROKE.fine}
          offset={[3, 2]}
        />
        {lines}
      </Motion>
      <Motion kind="flip-back">
        <Shape d={box(x, y, w, h, { bow: 1 })} color={BLUE} stroke={STROKE.fine} offset={[3, 2]} />
        {lines}
      </Motion>
    </g>
  );
}

function ChatBubble() {
  return (
    <g>
      <Shape d="M110 120Q110 100 132 100L246 100Q268 100 268 122L268 196Q268 216 246 216L160 216L132 240L138 216L132 216Q110 216 110 196Z" />
      <QueueCard x={140} y={124} w={96} />
      <g transform="rotate(-14 286 104)">
        <Shape d="M260 110L316 86L282 124Z" color={BLUE} stroke={STROKE.regular} />
        <Line d="M282 124L288 104" stroke={STROKE.fine} />
      </g>
    </g>
  );
}

function Widget() {
  return (
    <g>
      <Shape d={box(588, 92, 112, 104, { seed: 3, bow: 2 })} color={CORAL} />
      <Shape d={box(600, 104, 88, 80, { seed: 4, bow: 1 })} stroke={STROKE.fine} />
      <QueueCard x={612} y={126} w={64} />
      <Motion kind="twinkle" phase={0.5}>
        <Spark x={724} y={92} r={16} />
      </Motion>
    </g>
  );
}

function Laptop() {
  return (
    <g>
      <Line d="M556 472L550 542M716 470L722 542" />
      <Shape
        d={quad(
          [
            [540, 460],
            [732, 456],
            [734, 472],
            [538, 476],
          ],
          { seed: 5, bow: 1 },
        )}
        color={BLUE}
      />
      <Shape
        d={box(570, 352, 128, 86, { seed: 6, bow: 2 })}
        color={PURPLE}
        stroke={STROKE.regular}
      />
      <Shape d={box(580, 361, 108, 68, { seed: 7, bow: 1 })} stroke={STROKE.fine} />
      <QueueCard x={604} y={374} w={60} />
      <Shape
        d={quad(
          [
            [560, 438],
            [708, 438],
            [722, 456],
            [546, 456],
          ],
          { seed: 8, bow: 1 },
        )}
        stroke={STROKE.regular}
      />
      <Hatch d={box(612, 443, 44, 8)} />
    </g>
  );
}

function Person() {
  return (
    <g>
      <Line d={wave(250, 562, 200, { amp: 2, period: 40, seed: 4 })} stroke={STROKE.regular} />
      <Line d="M318 516L312 553M346 516L354 553" />
      <Line d="M300 554L314 554M352 554L366 554" stroke={9} />

      {/* Reviewing on the phone: eyes on the screen, thumb tapping the card. */}
      <Line
        d={curve([
          [298, 440],
          [330, 470],
          [380, 452],
        ])}
      />
      <Line
        d={curve([
          [362, 432],
          [384, 446],
          [398, 456],
        ])}
      />
      <Shape d={blob({ cx: 332, cy: 446, rx: 52, ry: 78, taper: 0.14, seed: 5 })} color={YELLOW} />
      <Hatch d={blob({ cx: 310, cy: 494, rx: 16, ry: 12, seed: 3 })} cross />
      <Line d="M324 371L320 356M334 369L336 353M344 371L350 357" stroke={STROKE.regular} />
      <Motion kind="blink" phase={2.2}>
        <Eye x={344} y={408} />
        <Eye x={366} y={407} />
      </Motion>
      <Line d="M346 428Q356 435 368 427" stroke={STROKE.regular} />

      <g transform="rotate(8 404 420)">
        <Shape
          d={box(382, 378, 44, 80, { seed: 9, bow: 2 })}
          color={CORAL}
          stroke={STROKE.regular}
        />
        <Shape d={box(388, 388, 32, 58, { seed: 10, bow: 1 })} stroke={STROKE.fine} />
        <QueueCard x={391} y={402} w={26} />
      </g>
      <Dot x={380} y={452} r={8} color={YELLOW} />
      <Motion kind="press">
        <Line d="M396 458L404 436" stroke={STROKE.bold} />
      </Motion>
    </g>
  );
}
