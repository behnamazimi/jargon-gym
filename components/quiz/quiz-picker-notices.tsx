import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditGateNotice } from "@/components/ai-credits/credit-gate-notice";
import { Button } from "@/components/ui/button";
import { largestQuizCount } from "@/lib/ai-credits/costs";
import { creditGate, isExhausted } from "@/lib/ai-credits/gate";
import { AI_CREDITS_LOW_THRESHOLD, type AiAccessView, type CreditUse } from "@/lib/llm/types";
import type { QuizQuestionStyle } from "@/lib/quiz/types";

function creditHint(ai: AiAccessView, cost: number) {
  if (ai.kind !== "credits") return null;

  if (cost > ai.remaining) return null;

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

/** AI quizzes are off for this account. Running out of credits is a different
 *  case, handled by `QuizPickerCreditGate`. */
function QuizPickerAiOffAlert() {
  return (
    <Alert variant="destructive" className="max-w-md">
      <AlertDescription>
        AI quizzes aren&apos;t available right now. Choose simple mode.
      </AlertDescription>
    </Alert>
  );
}

/** Out of credits needs no note: a simple quiz is free, and picking AI shows
 *  the credit gate. */
function QuizPickerFallbackNotice({ ai }: { ai: AiAccessView }) {
  if (isExhausted(ai)) return null;
  return (
    <p className="max-w-md text-xs text-base-content/70">
      AI quizzes aren&apos;t available right now, so we switched to a simple quiz.
    </p>
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
  if (aiRequiresSetup) return isExhausted(ai) ? null : <QuizPickerAiOffAlert />;
  if (aiFellBack && questionStyle === "simple") return <QuizPickerFallbackNotice ai={ai} />;
  return null;
}

/** The AI quiz can't be paid for: no credits left, or fewer than it costs. The
 *  free top-up is the footer's main button, so this explains and offers the
 *  other ways forward. */
export function QuizPickerCreditGate({
  ai,
  use,
  questionCount,
  onFit,
  onUseSimple,
}: {
  ai: AiAccessView;
  use: CreditUse;
  questionCount: number;
  onFit: (count: number) => void;
  onUseSimple: () => void;
}) {
  const { credits, cost } = use;
  const gate = creditGate(ai.topUp);
  const fitCount = credits ? largestQuizCount(questionCount, credits.remaining, credits.costs) : 0;

  const summary = credits ? (
    <>
      This quiz needs <span className="tabular-nums">{cost}</span> credits and you have{" "}
      <span className="tabular-nums">{credits.remaining}</span>.
    </>
  ) : (
    <>You&apos;ve used your AI credits for now.</>
  );

  return (
    <CreditGateNotice gate={gate} summary={summary}>
      {fitCount >= 1 ? (
        <Button type="button" size="sm" variant="outline" onPress={() => onFit(fitCount)}>
          Make it {fitCount} {fitCount === 1 ? "question" : "questions"}
        </Button>
      ) : null}
      {gate.kind !== "top-up" ? (
        <Button type="button" size="sm" variant="ghost" onPress={onUseSimple}>
          Use a simple quiz instead
        </Button>
      ) : null}
    </CreditGateNotice>
  );
}
