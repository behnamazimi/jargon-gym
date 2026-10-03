import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { CAPTURE_COPY } from "@/lib/capture/copy";

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
      <AlertTitle>
        {finished
          ? CAPTURE_COPY.duplicate(term, collectionName)
          : CAPTURE_COPY.duplicateUnfinished(term, collectionName)}
      </AlertTitle>
      <AlertDescription>{CAPTURE_COPY.qualifierHint}</AlertDescription>
      <AlertAction>
        <LinkButton href={`/app/library?domain=${collectionId}`} size="sm" variant="outline">
          {CAPTURE_COPY.openIt}
        </LinkButton>
      </AlertAction>
    </Alert>
  );
}
