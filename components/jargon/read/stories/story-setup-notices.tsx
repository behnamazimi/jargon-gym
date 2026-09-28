import { KeyRound } from "lucide-react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { PIECE_LENGTH_LABELS } from "@/components/jargon/read/stories/story-setup-fields";
import { largestFittingLength, storyCostForLength } from "@/lib/stories/credit-fit";
import type { PieceLength } from "@/lib/stories/types";
import { AI_CREDITS_LOW_THRESHOLD, aiAvailable, type AiAccessView } from "@/lib/llm/types";

type CreditUse = {
  credits: Extract<AiAccessView, { kind: "credits" }> | null;
  cost: number;
  overBalance: boolean;
};

/** What this story would spend, when it runs on AI credits. */
export function storyCreditUse(
  ai: AiAccessView,
  pieceLength: PieceLength,
  eligibleCount: number,
): CreditUse {
  const credits = ai.kind === "credits" ? ai : null;
  const cost = credits ? storyCostForLength(pieceLength, eligibleCount, credits.costs) : 0;
  return { credits, cost, overBalance: credits !== null && cost > credits.remaining };
}

export function StoryFooterHint({
  ai,
  use,
  termCount,
  hasEnoughTerms,
}: {
  ai: AiAccessView;
  use: CreditUse;
  termCount: number;
  hasEnoughTerms: boolean;
}) {
  if (!hasEnoughTerms) return null;

  if (use.credits && use.overBalance) {
    return (
      <>
        <span className="tabular-nums">{use.credits.remaining}</span> credits left.
      </>
    );
  }
  if (use.credits) {
    return (
      <>
        This story uses <span className="tabular-nums">{use.cost}</span> credits ·{" "}
        <span className="tabular-nums">{use.credits.remaining}</span> left
        {use.credits.remaining <= AI_CREDITS_LOW_THRESHOLD ? " — running low." : "."}
      </>
    );
  }
  if (ai.kind === "own") {
    return (
      <>
        Uses {termCount} terms from this collection · written by {ai.providerLabel}.
      </>
    );
  }
  return null;
}

function NoLlmAlert({ ai }: { ai: AiAccessView }) {
  const exhausted = ai.kind === "unavailable" && ai.reason === "exhausted";
  return (
    <Alert variant="destructive">
      <KeyRound className="size-4" aria-hidden strokeWidth={1.5} />
      <AlertDescription>
        {exhausted
          ? "You've used your AI credits. Add your own key in Settings to keep writing stories."
          : "Stories are written with an AI provider. Add a provider and API key in Settings."}
      </AlertDescription>
      <AlertAction>
        <LinkButton
          href="/jargon/settings?tab=ai"
          size="sm"
          variant="outline"
          className="max-md:min-h-11"
        >
          Go to Settings
        </LinkButton>
        <LinkButton
          href="/jargon/read?view=cards"
          size="sm"
          variant="ghost"
          className="max-md:min-h-11"
        >
          Read cards
        </LinkButton>
      </AlertAction>
    </Alert>
  );
}

function OverBalanceAlert({
  cost,
  remaining,
  fitLength,
  onFit,
}: {
  cost: number;
  remaining: number;
  fitLength: PieceLength | null;
  onFit: (length: PieceLength) => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        This story needs <span className="tabular-nums">{cost}</span> credits and you have{" "}
        <span className="tabular-nums">{remaining}</span>.
      </AlertDescription>
      {fitLength ? (
        <AlertAction>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="max-md:min-h-11"
            onPress={() => onFit(fitLength)}
          >
            Try {PIECE_LENGTH_LABELS[fitLength]}
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}

export function StoryNoAiNotice({ ai }: { ai: AiAccessView }) {
  return aiAvailable(ai) ? null : <NoLlmAlert ai={ai} />;
}

export function StoryOverBalance({
  use,
  pieceLength,
  eligibleCount,
  onFit,
}: {
  use: CreditUse;
  pieceLength: PieceLength;
  eligibleCount: number;
  onFit: (length: PieceLength) => void;
}) {
  const { credits, cost, overBalance } = use;
  if (!credits || !overBalance) return null;

  return (
    <OverBalanceAlert
      cost={cost}
      remaining={credits.remaining}
      fitLength={largestFittingLength(pieceLength, eligibleCount, credits.remaining, credits.costs)}
      onFit={onFit}
    />
  );
}
