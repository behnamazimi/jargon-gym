import { Alert, AlertDescription } from "@/components/ui/alert";

type ImportResultPanelProps = {
  message: string;
};

export function ImportResultPanel({ message }: ImportResultPanelProps) {
  return (
    <Alert className="mt-6">
      <AlertDescription className="text-[13px]">{message}</AlertDescription>
    </Alert>
  );
}
