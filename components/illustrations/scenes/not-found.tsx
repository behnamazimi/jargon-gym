import { blob, curve, wave } from "../geometry";
import { Illustration } from "../illustration";
import { Dot, DottedPath, Eye, Squiggle } from "../marks";
import { Motion } from "../motion";
import { BLUE, CORAL, PURPLE, YELLOW } from "../palette";
import { Hatch, Line, Shape, STROKE } from "../shape";

const SHOULDER: readonly [number, number] = [344, 410];

/**
 * For a missing page: someone sweeps a flashlight across the dotted outline
 * where a card should be, is surprised to find nothing there, and shrugs.
 */
export function NotFoundScene({ className, title }: { className?: string; title?: string }) {
  return (
    <Illustration className={className} title={title}>
      <Squiggle x={110} y={180} width={70} rotate={-10} seed={5} />
      <Dot x={190} y={250} r={7} color={YELLOW} />
      <Dot x={700} y={180} r={9} color={PURPLE} ring />
      <Line d={wave(160, 524, 540, { amp: 2, period: 44, seed: 3 })} stroke={STROKE.regular} />

      {/* Sweeps the beam over the empty spot, holds it there, lets it droop in the shrug. */}
      <Motion kind="search" pivot={SHOULDER}>
        <path d="M430 388L708 286L716 486L430 410Z" style={{ fill: YELLOW }} />
        <Line d="M430 388L708 286M430 410L716 486" stroke={STROKE.regular} />
        <Line d={curve([SHOULDER, [372, 418], [398, 404]])} />
        <g transform="rotate(-8 412 398)">
          <Shape d="M392 388L428 384L432 412L394 414Z" color={CORAL} stroke={STROKE.regular} />
          <Shape d="M428 380L440 378L444 418L432 418Z" stroke={STROKE.regular} />
        </g>
      </Motion>

      {/* Where the page should be: just an outline and some dust. */}
      <DottedPath d="M482 312L644 306L650 432L478 436Z" />
      <Motion kind="flutter" phase={0.4}>
        <Dot x={540} y={364} r={3} />
      </Motion>
      <Motion kind="flutter" phase={1.6}>
        <Dot x={598} y={392} r={2.5} />
      </Motion>
      <Motion kind="flutter" phase={2.4}>
        <Dot x={570} y={340} r={2} />
      </Motion>

      <Line d="M286 494L280 522M314 494L322 522" />
      <Line d="M268 523L282 523M320 523L334 523" stroke={9} />
      {/* Finds nothing: jolts in surprise (eyes pop, brows up, a hop), then shrugs
          with a palm up and the flashlight drooping. */}
      <Motion kind="surprise-marks">
        <Line d="M282 318L276 302M300 312L300 294M318 318L324 302" stroke={STROKE.regular} />
      </Motion>
      <Motion kind="shrug" origin="50% 100%">
        <Motion kind="shrug-arm" pivot={[258, 428]}>
          <Line
            d={curve([
              [258, 428],
              [240, 452],
              [236, 476],
            ])}
          />
          <Dot x={236} y={480} r={8} color={BLUE} />
        </Motion>
        <Shape d={blob({ cx: 300, cy: 420, rx: 50, ry: 80, taper: 0.12, seed: 8 })} color={BLUE} />
        <Hatch d={blob({ cx: 280, cy: 468, rx: 15, ry: 11, seed: 2 })} />
        <Motion kind="blink" phase={1.1}>
          <Motion kind="surprise-eyes">
            <Eye x={316} y={388} />
            <Eye x={338} y={386} />
          </Motion>
        </Motion>
        <Motion kind="surprise-brows">
          <Line d="M306 368Q314 360 324 366M332 366Q340 360 350 366" stroke={STROKE.regular} />
        </Motion>
        <Line d="M320 414Q328 410 338 413" stroke={STROKE.regular} />
      </Motion>
    </Illustration>
  );
}
