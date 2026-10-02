import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  releaseFocusAfterPointerPress,
  SOFT_ACTION_BUTTON_CLASS,
} from "@/components/jargon/review/review-playing-step";

type TriageActionsProps = {
  canUndo: boolean;
  onUndo: () => void;
  onNotYet: () => void;
  onKnew: () => void;
};

/** Same bottom row as Review: back-slot on the left, tinted choices next to it. */
export function TriageActions({ canUndo, onUndo, onNotYet, onKnew }: TriageActionsProps) {
  return (
    <div data-tour="triage-actions" className="shrink-0 space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onPress={(event) => {
            releaseFocusAfterPointerPress(event);
            onUndo();
          }}
          isDisabled={!canUndo}
          className="min-h-11 min-w-11 transition-transform active:scale-[0.96]"
          aria-label="Undo last choice"
        >
          <Undo2 className="size-4" aria-hidden strokeWidth={1.5} />
        </Button>

        <div className="grid flex-1 grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onPress={(event) => {
              releaseFocusAfterPointerPress(event);
              onNotYet();
            }}
            className={SOFT_ACTION_BUTTON_CLASS}
          >
            Not yet
          </Button>
          <Button
            type="button"
            variant="success"
            onPress={(event) => {
              releaseFocusAfterPointerPress(event);
              onKnew();
            }}
            className={SOFT_ACTION_BUTTON_CLASS}
          >
            I know this
          </Button>
        </div>
      </div>

      <p className="m-0 hidden text-center text-xs text-base-content/70 md:block coarse:hidden">
        <kbd className="kbd kbd-xs">Space</kbd> reveal · <kbd className="kbd kbd-xs">←</kbd> not yet
        · <kbd className="kbd kbd-xs">→</kbd> know it · <kbd className="kbd kbd-xs">Z</kbd> undo
      </p>
    </div>
  );
}
