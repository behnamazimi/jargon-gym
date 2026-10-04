"use client";

import { useState, type FormEvent } from "react";
import { reportCollection } from "@/app/(private)/app/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  REPORT_NOTE_MAX,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  REPORTED_THANKS,
  type ReportReason,
} from "@/lib/collections/moderation";

type ReportCollectionDialogProps = {
  domainId: string;
  domainName: string;
  onReported: () => void;
  onClose: () => void;
};

/** Mount it only while it is open, so every opening starts empty. */
export function ReportCollectionDialog({
  domainId,
  domainName,
  onReported,
  onClose,
}: ReportCollectionDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!reason || pending) return;
    setPending(true);
    setError(null);
    const result = await reportCollection(domainId, reason, note);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast(REPORTED_THANKS, "success");
    onReported();
    onClose();
  }

  return (
    <AlertDialog
      isOpen
      isDismissable={!pending}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <AlertDialogHeader>
        <AlertDialogTitle>Report collection</AlertDialogTitle>
        <AlertDialogDescription>
          Tell us what&apos;s wrong with &ldquo;{domainName}&rdquo;. Only the people who look after
          Lobyas will see this.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm">Reason</legend>
          {REPORT_REASONS.map((value) => (
            <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="report-reason"
                className="radio radio-sm"
                checked={reason === value}
                onChange={() => setReason(value)}
              />
              <span className="text-sm">{REPORT_REASON_LABELS[value]}</span>
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1">
          <span className="text-sm">Add a note (optional)</span>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={REPORT_NOTE_MAX}
            rows={3}
          />
        </label>
        {error ? (
          <p role="alert" className="m-0 text-sm text-error">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel isDisabled={pending}>Cancel</AlertDialogCancel>
          <Button type="submit" isDisabled={!reason || pending}>
            {pending ? "Reporting…" : "Report"}
          </Button>
        </AlertDialogFooter>
      </form>
    </AlertDialog>
  );
}
