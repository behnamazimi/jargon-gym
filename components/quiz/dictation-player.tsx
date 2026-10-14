"use client";

import { Volume2 } from "lucide-react";
import { useRef } from "react";
import {
  TermNarrationPlayer,
  type TermNarrationHandle,
} from "@/components/terms/term-narration-player";
import { Button } from "@/components/ui/button";
import { useMountEffect } from "@/hooks/use-mount-effect";

type DictationPlayerProps = {
  termId: string;
  clipVersion: string;
  /** Hides the skip link once the answer is in. */
  answered: boolean;
  onCantListen: () => void;
};

/** Plays the word when the question opens; the learner can replay it any time.
 *  If the clip won't load, or they can't listen, the question is skipped. */
export function DictationPlayer({
  termId,
  clipVersion,
  answered,
  onCantListen,
}: DictationPlayerProps) {
  const playerRef = useRef<TermNarrationHandle>(null);

  useMountEffect(() => {
    playerRef.current?.play();
  });

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <TermNarrationPlayer
        termId={termId}
        clipVersion={clipVersion}
        preload
        showButton={false}
        handleRef={playerRef}
        onUnavailable={onCantListen}
      />
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="gap-2"
        onPress={() => playerRef.current?.play()}
      >
        <Volume2 className="size-5" aria-hidden strokeWidth={1.5} />
        Play
      </Button>
      {answered ? null : (
        <Button type="button" variant="link" size="sm" onPress={onCantListen}>
          Can&apos;t listen now
        </Button>
      )}
    </div>
  );
}
