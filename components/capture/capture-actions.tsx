import { Button } from "@/components/ui/button";
import { CAPTURE_COPY } from "@/lib/capture/copy";

export function CaptureActions({
  canSave,
  isBusy,
  onSaveAnother,
}: {
  canSave: boolean;
  isBusy: boolean;
  onSaveAnother: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Button type="submit" className="min-h-12 w-full" isDisabled={!canSave}>
        {isBusy ? CAPTURE_COPY.saving : CAPTURE_COPY.save}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        isDisabled={!canSave}
        onPress={onSaveAnother}
      >
        {CAPTURE_COPY.saveAnother}
      </Button>
    </div>
  );
}
