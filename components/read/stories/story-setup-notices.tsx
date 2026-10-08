import { Sparkles } from "lucide-react";
import { CreditGateNotice } from "@/components/ai-credits/credit-gate-notice";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { PIECE_LENGTH_LABELS } from "@/components/read/stories/story-setup-fields";
import { creditGate, isExhausted } from "@/lib/ai-credits/gate";
import { largestFittingLength } from "@/lib/stories/credit-fit";
import type { PieceLength } from "@/lib/stories/types";
import {
  AI_CREDITS_LOW_THRESHOLD,
  aiAvailable,
  type AiAccessView,
  type CreditUse,
} from "@/lib/llm/types";

export function StoryFooterHint({
  use,
  hasEnoughTerms,
}: {
  use: CreditUse;
  hasEnoughTerms: boolean;
}) {
  if (!hasEnoughTerms || use.overBalance || !use.credits) return null;

  return (
    <>
      This story uses <span className="tabular-nums">{use.cost}</span> credits ·{" "}
      <span className="tabular-nums">{use.credits.remaining}</span> left
      {use.credits.remaining <= AI_CREDITS_LOW_THRESHOLD ? ", running low." : "."}
    </>
  );
}

/** AI is off for this account. Running out of credits is a different case,
 *  handled by `StoryCreditGate`. */
export function StoryNoAiNotice({ ai }: { ai: AiAccessView }) {
  if (aiAvailable(ai) || isExhausted(ai)) return null;
  return (
    <Alert variant="destructive" icon={<Sparkles strokeWidth={1.5} />}>
      <AlertDescription>Stories aren&apos;t available right now.</AlertDescription>
      <AlertAction>
        <LinkButton href="/app/read?view=cards" size="sm" variant="ghost">
          Read cards
        </LinkButton>
      </AlertAction>
    </Alert>
  );
}

/** The story can't be paid for: no credits left, or fewer than it costs. The
 *  free top-up is the footer's main button, so this explains and offers the
 *  other ways forward. */
export function StoryCreditGate({
  ai,
  use,
  pieceLength,
  eligibleCount,
  onFit,
}: {
  ai: AiAccessView;
  use: CreditUse;
  pieceLength: PieceLength;
  eligibleCount: number;
  onFit: (length: PieceLength) => void;
}) {
  const { credits, cost } = use;
  const gate = creditGate(ai.topUp);
  const fitLength = credits
    ? largestFittingLength(pieceLength, eligibleCount, credits.remaining, credits.costs)
    : null;

  const summary = credits ? (
    <>
      This story needs <span className="tabular-nums">{cost}</span> credits and you have{" "}
      <span className="tabular-nums">{credits.remaining}</span>.
    </>
  ) : (
    <>You&apos;ve used your AI credits for now.</>
  );

  return (
    <CreditGateNotice gate={gate} summary={summary}>
      {fitLength ? (
        <Button type="button" size="sm" variant="outline" onPress={() => onFit(fitLength)}>
          Make it {PIECE_LENGTH_LABELS[fitLength]} instead
        </Button>
      ) : null}
      {gate.kind !== "top-up" ? (
        <LinkButton href="/app/read?view=cards" size="sm" variant="ghost">
          Read cards instead
        </LinkButton>
      ) : null}
    </CreditGateNotice>
  );
}
