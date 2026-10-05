"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { submitIssueReport } from "@/app/(private)/app/issues/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ISSUE_COPY } from "@/lib/issues/copy";
import { isAcceptedImage, shrinkScreenshot } from "@/lib/issues/image";
import { BODY_MAX, BODY_MIN, ISSUE_KINDS, type IssueKind } from "@/lib/issues/schema";

type ReportIssueDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReportIssueDialog({ isOpen, onOpenChange }: ReportIssueDialogProps) {
  const [isSending, setIsSending] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open && isSending) return;
    onOpenChange(open);
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      isDismissable={!isSending}
      isKeyboardDismissDisabled={isSending}
      showCloseButton={!isSending}
      className="sm:max-w-lg"
    >
      <ReportIssueForm
        isSending={isSending}
        onSendingChange={setIsSending}
        onDone={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

type Screenshot = { blob: Blob; url: string };

function ReportIssueForm({
  isSending,
  onSendingChange,
  onDone,
}: {
  isSending: boolean;
  onSendingChange: (sending: boolean) => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<IssueKind>("problem");
  const [body, setBody] = useState("");
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedLength = body.trim().length;
  const canSend = trimmedLength >= BODY_MIN && !isSending && !isPreparing;

  function clearScreenshot() {
    if (screenshot) URL.revokeObjectURL(screenshot.url);
    setScreenshot(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function addScreenshot(file: File) {
    setError(null);
    if (!isAcceptedImage(file)) {
      setError(ISSUE_COPY.screenshotUnsupported);
      return;
    }
    setIsPreparing(true);
    const blob = await shrinkScreenshot(file);
    setIsPreparing(false);
    if (!blob) {
      setError(ISSUE_COPY.screenshotUnreadable);
      return;
    }
    clearScreenshot();
    setScreenshot({ blob, url: URL.createObjectURL(blob) });
  }

  function handlePaste(event: React.ClipboardEvent) {
    const file = Array.from(event.clipboardData.files).find((item) =>
      item.type.startsWith("image/"),
    );
    if (!file || isSending) return;
    event.preventDefault();
    void addScreenshot(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSend) return;

    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("body", body);
    formData.set("pagePath", window.location.pathname);
    formData.set("userAgent", navigator.userAgent);
    formData.set("viewport", `${window.innerWidth}x${window.innerHeight}`);
    if (screenshot) formData.set("screenshot", screenshot.blob, "screenshot.webp");

    setError(null);
    onSendingChange(true);
    let result: Awaited<ReturnType<typeof submitIssueReport>>;
    try {
      result = await submitIssueReport(formData);
    } catch {
      result = { ok: false, error: ISSUE_COPY.failed };
    }
    onSendingChange(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    clearScreenshot();
    toast(ISSUE_COPY.sent, "success");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} onPaste={handlePaste} className="flex min-h-0 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{ISSUE_COPY.title}</DialogTitle>
        <DialogDescription>{ISSUE_COPY.intro}</DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
        <ToggleGroup
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={new Set([kind])}
          onSelectionChange={(keys) => {
            const next = keys.values().next().value;
            if (next === "problem" || next === "idea") setKind(next);
          }}
          aria-label={ISSUE_COPY.kindLabel}
          isDisabled={isSending}
          className="w-full"
        >
          {ISSUE_KINDS.map((item) => (
            <ToggleGroupItem key={item} id={item} className="flex-1">
              {ISSUE_COPY.kinds[item]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{ISSUE_COPY.bodyLabel}</span>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={ISSUE_COPY.bodyPlaceholder[kind]}
            maxLength={BODY_MAX}
            rows={5}
            disabled={isSending}
            autoFocus
            required
          />
          <span className="self-end text-xs text-base-content/60 tabular-nums">
            {trimmedLength < BODY_MIN ? ISSUE_COPY.bodyTooShort : `${body.length}/${BODY_MAX}`}
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{ISSUE_COPY.screenshotLabel}</span>
          {screenshot ? (
            <div className="relative w-fit">
              {/* oxlint-disable-next-line nextjs/no-img-element -- a local blob preview */}
              <img
                src={screenshot.url}
                alt=""
                className="max-h-40 rounded-field border border-base-300 object-contain"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon-xs"
                className="btn-circle absolute -top-2 -right-2"
                onPress={clearScreenshot}
                isDisabled={isSending}
                aria-label={ISSUE_COPY.screenshotRemove}
              >
                <X className="size-3" aria-hidden />
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onPress={() => fileInput.current?.click()}
                isDisabled={isSending || isPreparing}
              >
                <ImagePlus className="size-4" aria-hidden />
                {isPreparing ? ISSUE_COPY.screenshotPreparing : ISSUE_COPY.screenshotAdd}
              </Button>
              <span className="text-xs text-base-content/60">{ISSUE_COPY.screenshotPasteHint}</span>
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void addScreenshot(file);
            }}
          />
          <p className="m-0 text-xs text-base-content/60">{ISSUE_COPY.screenshotHint}</p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <DialogFooter className="shrink-0">
        <Button type="button" variant="outline" slot="close" isDisabled={isSending}>
          {ISSUE_COPY.cancel}
        </Button>
        <Button type="submit" isDisabled={!canSend}>
          {isSending ? ISSUE_COPY.sending : ISSUE_COPY.send}
        </Button>
      </DialogFooter>
    </form>
  );
}
