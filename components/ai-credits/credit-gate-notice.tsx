import { Gift } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import type { CreditGate } from "@/lib/ai-credits/gate";
import { TOPUP_COPY } from "@/lib/ai-credits/topup-copy";

/** The calm notice shown when a request can't be paid for. It says what is
 *  missing, offers the free credits when the person is eligible, and leaves the
 *  other ways forward (a smaller request, a free alternative) as `children`.
 *  The top-up button itself lives where the person is already looking: the
 *  setup footer's main button, or `action` in a spot with no main button. */
export function CreditGateNotice({
  gate,
  summary,
  action,
  children,
}: {
  gate: CreditGate;
  /** What is missing, e.g. "This story needs 6 credits and you have 5." */
  summary: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  const hasActions = Boolean(action) || Boolean(children);
  return (
    <Alert variant="info" icon={<Gift strokeWidth={1.5} />}>
      <AlertDescription className="text-base-content">
        {summary}{" "}
        {gate.kind === "top-up" ? (
          <span className="font-medium">{TOPUP_COPY.eligible(gate.amount)}</span>
        ) : gate.kind === "tomorrow" ? (
          TOPUP_COPY.alreadyToday
        ) : null}
      </AlertDescription>
      {hasActions ? (
        <AlertAction>
          {action}
          {children}
        </AlertAction>
      ) : null}
    </Alert>
  );
}
