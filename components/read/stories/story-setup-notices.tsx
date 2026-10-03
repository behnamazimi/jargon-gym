import { KeyRound } from "lucide-react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { PIECE_LENGTH_LABELS } from "@/components/read/stories/story-setup-fields";
import { largestFittingLength } from "@/lib/stories/credit-fit";
import type { PieceLength } from "@/lib/stories/types";
import {
  AI_CREDITS_LOW_THRESHOLD,
  aiAvailable,
  type AiAccessView,
  type CreditUse,
} from "@/lib/llm/types";

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
        {use.credits.remaining <= AI_CREDITS_LOW_THRESHOLD ? ", running low." : "."}
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
    <Alert variant="destructive" icon={<KeyRound strokeWidth={1.5} />}>
      <AlertDescription>
        {exhausted
          ? "You've used your AI credits for now. Add your own key in Settings to keep writing stories."
          : "Stories are written with an AI provider. Add a provider and API key in Settings."}
      </AlertDescription>
      <AlertAction>
        <LinkButton href="/app/settings?tab=ai" size="sm" variant="outline">
          Go to Settings
        </LinkButton>
        <LinkButton href="/app/read?view=cards" size="sm" variant="ghost">
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
      <AlertAction>
        {fitLength ? (
          <Button type="button" size="sm" variant="outline" onPress={() => onFit(fitLength)}>
            Try {PIECE_LENGTH_LABELS[fitLength]}
          </Button>
        ) : (
          <>
            <LinkButton href="/app/settings?tab=ai" size="sm" variant="outline">
              Add your own key
            </LinkButton>
            <LinkButton href="/app/read?view=cards" size="sm" variant="ghost">
              Read cards
            </LinkButton>
          </>
        )}
      </AlertAction>
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
