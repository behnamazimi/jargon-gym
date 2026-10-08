"use client";

import { OptionRow } from "@/components/read/read-option-row";
import { OptionsMenu } from "@/components/shared/options-menu";
import { useMediaQuery } from "@/hooks/use-platform";
import { PLATFORM_MEDIA } from "@/lib/platform";
import type { ReviewOptionKey, ReviewOptions } from "@/lib/review/options";

type ReviewOptionsMenuProps = {
  options: ReviewOptions;
  narrationAccess: boolean;
  onChange: (key: ReviewOptionKey, value: boolean) => void;
};

/** Gear above the card. Rows that can't apply to this person or device are
 *  left out, and with none left there's no gear. */
export function ReviewOptionsMenu({ options, narrationAccess, onChange }: ReviewOptionsMenuProps) {
  const touch = useMediaQuery(PLATFORM_MEDIA.coarsePointer, false);
  if (!narrationAccess && !touch) return null;

  return (
    <OptionsMenu label="Review options">
      <ul className="m-0 list-none divide-y divide-base-300/60 p-0">
        {narrationAccess ? (
          <OptionRow
            id="review-option-narrateOnReveal"
            label="Play narration when card revealed"
            description="Plays the AI voice for terms that have a clip."
            checked={options.narrateOnReveal}
            onChange={(checked) => onChange("narrateOnReveal", checked)}
          />
        ) : null}
        {touch ? (
          <OptionRow
            id="review-option-swipe"
            label="Swipe gestures"
            description="Swipe up to reveal, sideways to move between terms."
            checked={options.swipe}
            onChange={(checked) => onChange("swipe", checked)}
          />
        ) : null}
      </ul>
    </OptionsMenu>
  );
}
