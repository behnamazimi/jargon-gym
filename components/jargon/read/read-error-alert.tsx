import { AlertCircle } from "lucide-react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const PRESS_CLASS = "transition-transform duration-150 ease-out active:scale-[0.96]";

export function ReadErrorAlert({
  message,
  isPending,
  onRetry,
}: {
  message: string;
  isPending: boolean;
  onRetry: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" aria-hidden strokeWidth={1.5} />
      <AlertDescription>{message}</AlertDescription>
      <AlertAction>
        <Button
          type="button"
          size="sm"
          onPress={onRetry}
          isDisabled={isPending}
          className={PRESS_CLASS}
        >
          {isPending ? "Loading…" : "Try again"}
        </Button>
      </AlertAction>
    </Alert>
  );
}
