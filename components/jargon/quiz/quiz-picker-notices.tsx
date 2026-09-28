import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { largestQuizCount, quizCost } from "@/lib/ai-credits/costs";
import { AI_CREDITS_LOW_THRESHOLD, type AiAccessView } from "@/lib/llm/types";
import type { QuizQuestionStyle } from "@/lib/quiz/types";

type CreditUse = {
  credits: Extract<AiAccessView, { kind: "credits" }> | null;
  cost: number;
  overBalance: boolean;
};

/** What this quiz would spend, when it runs on AI credits. */
export function quizCreditUse(
  questionStyle: QuizQuestionStyle,
  ai: AiAccessView,
  questionCount: number,
): CreditUse {
  const credits = questionStyle === "ai" && ai.kind === "credits" ? ai : null;
  const cost = credits ? quizCost(questionCount, credits.costs) : 0;
  return { credits, cost, overBalance: credits !== null && cost > credits.remaining };
}

export function QuizPickerFooterHint({
  questionStyle,
  ai,
  cost,
}: {
  questionStyle: QuizQuestionStyle;
  ai: AiAccessView;
  cost: number;
}) {
  if (questionStyle === "simple") return <>Uses terms from your collections — no AI needed.</>;
  if (ai.kind === "own") return <>Uses {ai.providerLabel} — this may take a moment.</>;
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
      This quiz uses <span className="tabular-nums">{cost}</span> credits ·{" "}
      <span className="tabular-nums">{ai.remaining}</span> left
      {isLow ? " — running low." : "."}
    </>
  );
}

function QuizPickerAiSetupAlert({ ai }: { ai: AiAccessView }) {
  const exhausted = ai.kind === "unavailable" && ai.reason === "exhausted";
  return (
    <Alert variant="destructive" className="max-w-md">
      <AlertDescription>
        {exhausted
          ? "You've used your AI credits. Add your own key in Settings, or use a simple quiz."
          : "AI quizzes need a provider and API key in Settings. Choose simple mode, or set up an LLM provider."}
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
      </AlertAction>
    </Alert>
  );
}

function QuizPickerFallbackNotice({ ai }: { ai: AiAccessView }) {
  const exhausted = ai.kind === "unavailable" && ai.reason === "exhausted";
  return (
    <p className="max-w-md text-xs text-base-content/60">
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="max-md:min-h-11"
            onPress={() => onFit(fitCount)}
          >
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
