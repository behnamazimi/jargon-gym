import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { CAPTURE_COPY } from "@/lib/jargon/capture/copy";

export function CaptureDuplicateNote({
  term,
  finished,
  collectionName,
  collectionId,
}: {
  term: string;
  finished: boolean;
  collectionName: string;
  collectionId: string;
}) {
  return (
    <Alert>
      <AlertDescription role="status">
        <p className="m-0">
          {finished
            ? CAPTURE_COPY.duplicate(term, collectionName)
            : CAPTURE_COPY.duplicateUnfinished(term, collectionName)}
        </p>
        <p className="m-0 text-base-content/60">{CAPTURE_COPY.qualifierHint}</p>
      </AlertDescription>
      <AlertAction>
        <LinkButton
          href={`/jargon?domain=${collectionId}`}
          size="sm"
          variant="outline"
          className="min-h-11 md:min-h-8"
        >
          {CAPTURE_COPY.openIt}
        </LinkButton>
      </AlertAction>
    </Alert>
  );
}
