import { Check } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { CAPTURE_COPY } from "@/lib/capture/copy";

export function CaptureSaved({
  term,
  unfinished,
  collectionName,
  collectionId,
  onAddAnother,
}: {
  term: string;
  unfinished: boolean;
  collectionName: string;
  collectionId: string;
  onAddAnother: () => void;
}) {
  return (
    <div className="space-y-5 pt-2">
      <div className="flex size-12 items-center justify-center rounded-box bg-success/15 text-success-text">
        <Check className="size-6" aria-hidden strokeWidth={1.5} />
      </div>
      <p className="m-0 text-base-content/80" role="status">
        {unfinished
          ? CAPTURE_COPY.savedUnfinished(term, collectionName)
          : CAPTURE_COPY.saved(term, collectionName)}
      </p>
      <div className="flex flex-col gap-2">
        <Button className="min-h-12 w-full" onPress={onAddAnother}>
          {CAPTURE_COPY.addAnother}
        </Button>
        <LinkButton
          href={`/app/library?collection=${collectionId}`}
          variant="outline"
          className="min-h-11 w-full"
        >
          {CAPTURE_COPY.openCollection}
        </LinkButton>
      </div>
    </div>
  );
}
