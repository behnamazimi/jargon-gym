import type { TourTargetId } from "../targets";

export type TourPlacement = "top" | "bottom" | "left" | "right";

type TourStep = {
  target: TourTargetId;
  title: string;
  body: string;
  /** Replaces `body` on touch screens, where the gesture differs. */
  bodyTouch?: string;
  placement?: TourPlacement;
  /** Move on by itself once this target appears, e.g. the grade buttons
   *  showing up after the card is flipped. */
  advanceOnTarget?: TourTargetId;
};

export type TourChapter = {
  id: string;
  /** Exact pathname(s) the chapter runs on. */
  route: string | readonly string[];
  steps: readonly TourStep[];
};
