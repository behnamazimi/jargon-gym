import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { TopUpButton } from "@/components/ai-credits/top-up-button";
import { Button } from "@/components/ui/button";
import { largestQuizCount } from "@/lib/ai-credits/costs";
import { AI_CREDITS_LOW_THRESHOLD, type AiAccessView, type CreditUse } from "@/lib/llm/types";
import type { QuizQuestionStyle } from "@/lib/quiz/types";

function creditHint(ai: AiAccessView, cost: number) {
  if (ai.kind !== "credits") return null;

  if (cost > ai.remaining) {
    return (
      <>
        <span className="tabular-nums">{ai.remaining}</span> credits left.
      </>
    );
  }

  const isLow = ai.remaining <= AI_CREDITS_LOW_THRESHOLD;
  return (
    <>
      This quiz uses up to <span className="tabular-nums">{cost}</span> credits ·{" "}
      <span className="tabular-nums">{ai.remaining}</span> left
      {isLow ? ", running low." : "."}
    </>
  );
}

/** Simple quizzes keep the line's space (hidden) so switching style doesn't move the page. */
export function QuizPickerFooterHint({
  questionStyle,
  ai,
  cost,
}: {
  questionStyle: QuizQuestionStyle;
  ai: AiAccessView;
  cost: number;
}) {
  const hint = creditHint(ai, cost);
  if (questionStyle === "simple" && hint) return <span className="invisible">{hint}</span>;
  return hint;
}

function QuizPickerAiSetupAlert({ ai }: { ai: AiAccessView }) {
  const exhausted = ai.kind === "unavailable" && ai.reason === "exhausted";
  return (
    <Alert variant="destructive" className="max-w-md">
      <AlertDescription>
        {exhausted
          ? "You've used your AI credits for now. Top up to keep going, or use a simple quiz."
          : "AI quizzes aren't available right now. Choose simple mode."}
      </AlertDescription>
      {exhausted ? (
        <AlertAction>
          <TopUpButton size="sm" variant="outline" />
        </AlertAction>
      ) : null}
    </Alert>
  );
}

function QuizPickerFallbackNotice({ ai }: { ai: AiAccessView }) {
  const exhausted = ai.kind === "unavailable" && ai.reason === "exhausted";
  return (
    <p className="max-w-md text-xs text-base-content/70">
      {exhausted
        ? "You're out of AI credits, so we switched to a simple quiz."
        : "AI quizzes aren't available right now, so we switched to a simple quiz."}
    </p>
  );
}

function QuizPickerOverBalanceAlert({
  cost,
  remaining,
  fitCount,
  onFit,
}: {
  cost: number;
  remaining: number;
  fitCount: number;
  onFit: (count: number) => void;
}) {
  return (
    <Alert variant="destructive" className="max-w-md">
      <AlertDescription>
        This quiz needs <span className="tabular-nums">{cost}</span> credits and you have{" "}
        <span className="tabular-nums">{remaining}</span>.
      </AlertDescription>
      {fitCount >= 1 ? (
        <AlertAction>
          <Button type="button" size="sm" variant="outline" onPress={() => onFit(fitCount)}>
            Make it {fitCount} {fitCount === 1 ? "question" : "questions"}
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}

export function QuizPickerAiNotices({
  ai,
  aiFellBack,
  aiRequiresSetup,
  questionStyle,
}: {
  ai: AiAccessView;
  aiFellBack: boolean;
  aiRequiresSetup: boolean;
  questionStyle: QuizQuestionStyle;
}) {
  if (aiRequiresSetup) return <QuizPickerAiSetupAlert ai={ai} />;
  if (aiFellBack && questionStyle === "simple") return <QuizPickerFallbackNotice ai={ai} />;
  return null;
}

export function QuizPickerOverBalance({
  use,
  questionCount,
  onFit,
}: {
  use: CreditUse;
  questionCount: number;
  onFit: (count: number) => void;
}) {
  const { credits, cost, overBalance } = use;
  if (!credits || !overBalance) return null;

  return (
    <QuizPickerOverBalanceAlert
      cost={cost}
      remaining={credits.remaining}
      fitCount={largestQuizCount(questionCount, credits.remaining, credits.costs)}
      onFit={onFit}
    />
  );
}
